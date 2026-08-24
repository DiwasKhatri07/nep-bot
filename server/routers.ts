import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { commandCatalog } from "./commandCatalog";
import { generateAiReply, validatePhoneNumber } from "./botService";
import * as db from "./db";
import { whatsappConnector } from "./whatsappConnector";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const botNameSchema = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 _-]{1,63}$/, "Use 2–64 letters, numbers, spaces, hyphens, or underscores.");
const profileIdSchema = z.number().int().positive();
const featureSchema = z.object({
  antiLink: z.boolean().optional(),
  antiCall: z.boolean().optional(),
  autoRead: z.boolean().optional(),
  autoReact: z.boolean().optional(),
  groupControls: z.boolean().optional(),
  aiAutoReply: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, "Select at least one feature to update.");

async function ownedProfile(userId: number, profileId: number) {
  const profile = await db.getBotProfileForOwner(userId, profileId);
  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Bot profile not found." });
  return profile;
}

function clientProfile<T extends { sessionStorageKey?: string | null }>(profile: T) {
  const { sessionStorageKey: _sessionStorageKey, ...safeProfile } = profile;
  return safeProfile;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  bot: router({
    catalog: protectedProcedure.query(() => commandCatalog),
    list: protectedProcedure.query(async ({ ctx }) => (await db.listBotProfiles(ctx.user.id)).map(clientProfile)),
    activity: protectedProcedure.input(z.object({ profileId: profileIdSchema.optional() }).optional()).query(({ ctx, input }) => db.listActivity(ctx.user.id, input?.profileId)),
    profile: protectedProcedure.input(z.object({ profileId: profileIdSchema })).query(async ({ ctx, input }) => {
      const profile = await ownedProfile(ctx.user.id, input.profileId);
      const features = await db.getFeatureSettings(profile.id);
      return { profile: clientProfile(profile), features };
    }),
    create: protectedProcedure.input(z.object({
      botName: botNameSchema,
      countryIso: z.string().regex(/^[A-Za-z]{2}$/),
      countryDialCode: z.string().regex(/^\+?[0-9]{1,4}$/),
      nationalNumber: z.string().min(4).max(32),
    })).mutation(async ({ ctx, input }) => {
      const validation = await validatePhoneNumber({
        countryIso: input.countryIso.toUpperCase(),
        countryDialCode: input.countryDialCode,
        nationalNumber: input.nationalNumber,
      });
      if (!validation.valid || !validation.e164 || !validation.countryIso || !validation.dialCode || !validation.nationalFormatted) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.error || "Enter a valid E.164 phone number." });
      }
      const profile = await db.createBotProfile({
        ownerId: ctx.user.id,
        botName: input.botName,
        phoneE164: validation.e164,
        countryIso: validation.countryIso,
        countryDialCode: `+${validation.dialCode}`,
        nationalNumber: validation.nationalFormatted,
        connectionStatus: "ready_to_pair",
        publicMode: false,
        commandPreferences: JSON.stringify(["/hi", "/roast", "/menu", "/joke", "/meme", "/translate"]),
      });
      if (!profile) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Bot profile could not be created." });
      await db.addActivity(profile.id, "profile_created", "Bot profile created and phone number validated.");
      return clientProfile(profile);
    }),
    requestPairing: protectedProcedure.input(z.object({ profileId: profileIdSchema })).mutation(async ({ ctx, input }) => {
      const profile = await ownedProfile(ctx.user.id, input.profileId);
      try {
        const connector = await whatsappConnector.requestPairing(profile);
        await db.addActivity(profile.id, "pairing_code_issued", "A temporary pairing code was issued. It was not stored.");
        return connector;
      } catch (error) {
        await db.updateBotProfile(profile.id, { connectionStatus: "error" });
        await db.addActivity(profile.id, "pairing_failed", "Pairing request could not be completed by the linked-device connector.");
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Pairing could not be requested." });
      }
    }),
    connectorConfiguration: protectedProcedure.query(() => ({ configured: true })),
    syncStatus: protectedProcedure.input(z.object({ profileId: profileIdSchema })).mutation(async ({ ctx, input }) => {
      const profile = await ownedProfile(ctx.user.id, input.profileId);
      const result = await whatsappConnector.getStatus(profile);
      const nextStatus = result.connectionStatus;
      if (profile.connectionStatus !== nextStatus) {
        await db.updateBotProfile(profile.id, { connectionStatus: nextStatus });
        await db.addActivity(profile.id, "connection_status_updated", `Connector status updated to ${nextStatus.replace(/_/g, " ")}.`);
      }
      return { configured: true, connectionStatus: nextStatus };
    }),
    disconnect: protectedProcedure.input(z.object({ profileId: profileIdSchema })).mutation(async ({ ctx, input }) => {
      const profile = await ownedProfile(ctx.user.id, input.profileId);
      try {
        return await whatsappConnector.disconnect(profile);
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Connector disconnect failed." });
      }
    }),
    updateMode: protectedProcedure.input(z.object({ profileId: profileIdSchema, publicMode: z.boolean() })).mutation(async ({ ctx, input }) => {
      const profile = await ownedProfile(ctx.user.id, input.profileId);
      await db.updateBotProfile(profile.id, { publicMode: input.publicMode });
      await db.addActivity(profile.id, "mode_updated", input.publicMode ? "Public command mode enabled." : "Private owner-only command mode enabled.");
      return { success: true };
    }),
    updateFeatures: protectedProcedure.input(z.object({ profileId: profileIdSchema, settings: featureSchema })).mutation(async ({ ctx, input }) => {
      const profile = await ownedProfile(ctx.user.id, input.profileId);
      const settings = await db.updateFeatureSettings(profile.id, input.settings);
      await db.addActivity(profile.id, "features_updated", "Owner moderation and automation settings were updated.");
      return settings;
    }),
    aiPreview: protectedProcedure.input(z.object({ prompt: z.string().trim().min(1).max(500) })).mutation(async ({ input }) => {
      const result = await generateAiReply(input.prompt);
      if (result.status !== "ok" || !result.response) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: result.error || "AI is not configured." });
      }
      return { response: result.response };
    }),
  }),
});

export type AppRouter = typeof appRouter;
