import { describe, expect, it } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    getFeatureSettings: vi.fn(),
    addActivity: vi.fn(),
  },
}));

vi.mock("./db", () => dbMock);

import { activeFeatureNames, handleWelcomeMessage, whatsappConnector } from "./whatsappConnector";

const profile = {
  id: 77,
  ownerId: 23,
  botName: "NEP Support",
  phoneE164: "+9779841234567",
  countryIso: "NP",
  countryDialCode: "+977",
  nationalNumber: "984-1234567",
  connectionStatus: "connected",
  publicMode: true,
  commandPreferences: "[]",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("first-party WhatsApp connector", () => {
  beforeEach(() => vi.clearAllMocks());
  it("loads without opening a linked-device session", () => {
    expect(whatsappConnector).toBeDefined();
    expect(typeof whatsappConnector.getStatus).toBe("function");
    expect(typeof whatsappConnector.requestPairing).toBe("function");
  });

  it("includes persisted advanced feature states in the connector command context", () => {
    expect(activeFeatureNames({ antiLink: true, welcomeMessage: true, commandAudit: false, profileId: 77 })).toEqual(["antiLink", "welcomeMessage"]);
  });

  it("uses the persisted welcome-message setting before sending a group welcome", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    dbMock.getFeatureSettings.mockResolvedValue({ welcomeMessage: true });

    await expect(handleWelcomeMessage(profile, { sendMessage } as never, { id: "group@g.us", action: "add", participants: ["new@s.whatsapp.net"] })).resolves.toBe(true);
    expect(sendMessage).toHaveBeenCalledWith("group@g.us", expect.objectContaining({ text: expect.stringContaining("NEP Support") }));
    expect(dbMock.addActivity).toHaveBeenCalledWith(77, "welcome_message_sent", expect.any(String));
  });

  it("uses the persisted command-audit setting when processing a live command", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    dbMock.getFeatureSettings.mockResolvedValue({ commandAudit: false, autoRead: false, autoReact: false, antiLink: false, aiAutoReply: false });
    const session = { socket: { sendMessage }, status: "connected", startedAt: Date.now(), recentMessageIds: new Set<string>() };
    const event = { type: "notify", messages: [{ key: { id: "command-1", remoteJid: "9779800000000@s.whatsapp.net", fromMe: false }, messageTimestamp: Math.floor(Date.now() / 1000), message: { conversation: "/ping" } }] };

    await (whatsappConnector as any).respondToMessage(profile, session, event);
    expect(sendMessage).toHaveBeenCalledWith("9779800000000@s.whatsapp.net", expect.objectContaining({ text: "Pong. NEP BOT command listener is active." }), expect.any(Object));
    expect(dbMock.addActivity).not.toHaveBeenCalledWith(77, "command_handled", expect.any(String));
  });
});
