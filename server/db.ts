import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { BotFeatureSettings, botActivity, botFeatureSettings, botProfiles, InsertBotProfile, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listBotProfiles(ownerId: number) {
  const db = await requireDb();
  return db.select().from(botProfiles).where(eq(botProfiles.ownerId, ownerId)).orderBy(desc(botProfiles.updatedAt));
}

export async function getBotProfileForOwner(ownerId: number, profileId: number) {
  const db = await requireDb();
  const rows = await db.select().from(botProfiles).where(and(eq(botProfiles.id, profileId), eq(botProfiles.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function createBotProfile(profile: InsertBotProfile) {
  const db = await requireDb();
  const result = await db.insert(botProfiles).values(profile);
  const id = Number(result[0].insertId);
  await db.insert(botFeatureSettings).values({ profileId: id });
  return getBotProfileForOwner(profile.ownerId, id);
}

export async function getFeatureSettings(profileId: number): Promise<BotFeatureSettings | undefined> {
  const db = await requireDb();
  const rows = await db.select().from(botFeatureSettings).where(eq(botFeatureSettings.profileId, profileId)).limit(1);
  return rows[0];
}

export async function updateBotProfile(profileId: number, updates: Partial<Pick<InsertBotProfile, "connectionStatus" | "publicMode" | "commandPreferences">>) {
  const db = await requireDb();
  await db.update(botProfiles).set(updates).where(eq(botProfiles.id, profileId));
}

export async function updateSessionStorageKey(profileId: number, sessionStorageKey: string | null) {
  const db = await requireDb();
  await db.update(botProfiles).set({ sessionStorageKey }).where(eq(botProfiles.id, profileId));
}

export async function updateFeatureSettings(profileId: number, updates: Partial<Pick<BotFeatureSettings, "antiLink" | "antiCall" | "autoRead" | "autoReact" | "groupControls" | "aiAutoReply">>) {
  const db = await requireDb();
  await db.update(botFeatureSettings).set(updates).where(eq(botFeatureSettings.profileId, profileId));
  return getFeatureSettings(profileId);
}

export async function addActivity(profileId: number, eventType: string, summary: string) {
  const db = await requireDb();
  await db.insert(botActivity).values({ profileId, eventType, summary: summary.slice(0, 255) });
}

export async function listActivity(ownerId: number, profileId?: number) {
  const db = await requireDb();
  if (profileId) {
    return db.select({ id: botActivity.id, profileId: botActivity.profileId, eventType: botActivity.eventType, summary: botActivity.summary, createdAt: botActivity.createdAt })
      .from(botActivity)
      .innerJoin(botProfiles, eq(botActivity.profileId, botProfiles.id))
      .where(and(eq(botProfiles.ownerId, ownerId), eq(botActivity.profileId, profileId)))
      .orderBy(desc(botActivity.createdAt)).limit(80);
  }
  return db.select({ id: botActivity.id, profileId: botActivity.profileId, eventType: botActivity.eventType, summary: botActivity.summary, createdAt: botActivity.createdAt })
    .from(botActivity)
    .innerJoin(botProfiles, eq(botActivity.profileId, botProfiles.id))
    .where(eq(botProfiles.ownerId, ownerId))
    .orderBy(desc(botActivity.createdAt)).limit(80);
}
