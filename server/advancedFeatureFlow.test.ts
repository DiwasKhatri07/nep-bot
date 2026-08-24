import { describe, expect, it, vi } from "vitest";

const { dbMock, storedFeatures } = vi.hoisted(() => {
  const storedFeatures = {
    id: 9,
    profileId: 77,
    antiLink: false,
    antiCall: false,
    autoRead: false,
    autoReact: false,
    groupControls: false,
    aiAutoReply: false,
    welcomeMessage: false,
    commandAudit: true,
    updatedAt: new Date(),
  };
  return {
    storedFeatures,
    dbMock: {
      getBotProfileForOwner: vi.fn(),
      updateFeatureSettings: vi.fn(async (_profileId: number, updates: Record<string, boolean>) => Object.assign(storedFeatures, updates)),
      getFeatureSettings: vi.fn(async () => storedFeatures),
      addActivity: vi.fn(),
    },
  };
});

vi.mock("./db", () => dbMock);
vi.mock("./botService", () => ({ generateAiReply: vi.fn(), validatePhoneNumber: vi.fn() }));

import { appRouter } from "./routers";
import { handleWelcomeMessage } from "./whatsappConnector";

const profile = {
  id: 77,
  ownerId: 23,
  botName: "NEP Support",
  phoneE164: "+9779841234567",
  countryIso: "NP",
  countryDialCode: "+977",
  nationalNumber: "984-1234567",
  connectionStatus: "connected" as const,
  publicMode: true,
  commandPreferences: "[]",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createCaller() {
  return appRouter.createCaller({
    user: { id: 23, openId: "owner-23", name: "Owner", email: "owner@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} },
    res: { clearCookie: vi.fn() },
  } as never);
}

describe("advanced feature owner-to-connector flow", () => {
  it("persists an owner welcome-message update and consumes it in the connector in the same flow", async () => {
    storedFeatures.welcomeMessage = false;
    dbMock.getBotProfileForOwner.mockResolvedValue(profile);
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await expect(createCaller().bot.updateFeatures({ profileId: 77, settings: { welcomeMessage: true, commandAudit: false } })).resolves.toMatchObject({ welcomeMessage: true, commandAudit: false });
    await expect(handleWelcomeMessage(profile, { sendMessage } as never, { id: "approved-group@g.us", action: "add", participants: ["new@s.whatsapp.net"] })).resolves.toBe(true);

    expect(dbMock.updateFeatureSettings).toHaveBeenCalledWith(77, { welcomeMessage: true, commandAudit: false });
    expect(dbMock.getFeatureSettings).toHaveBeenCalledWith(77);
    expect(sendMessage).toHaveBeenCalledWith("approved-group@g.us", expect.objectContaining({ text: expect.stringContaining("NEP Support") }));
  });
});
