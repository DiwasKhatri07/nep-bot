import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, serviceMock, connectorMock } = vi.hoisted(() => ({
  dbMock: {
    createBotProfile: vi.fn(),
    addActivity: vi.fn(),
    getBotProfileForOwner: vi.fn(),
    updateBotProfile: vi.fn(),
    updateFeatureSettings: vi.fn(),
    getFeatureSettings: vi.fn(),
    listBotProfiles: vi.fn(),
    listActivity: vi.fn(),
  },
  serviceMock: {
    validatePhoneNumber: vi.fn(),
  },
  connectorMock: {
    requestPairing: vi.fn(),
    getStatus: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock("./db", () => dbMock);
vi.mock("./botService", () => serviceMock);
vi.mock("./whatsappConnector", () => ({ whatsappConnector: connectorMock }));

import { appRouter } from "./routers";

function createCaller() {
  return appRouter.createCaller({
    user: {
      id: 23,
      openId: "owner-23",
      name: "Owner",
      email: "owner@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} },
    res: { clearCookie: vi.fn() },
  } as never);
}

const profile = {
  id: 77,
  ownerId: 23,
  botName: "NEP Support",
  phoneE164: "+9779841234567",
  countryIso: "NP",
  countryDialCode: "+977",
  nationalNumber: "984-1234567",
  sessionStorageKey: "connector-sessions/77/auth_opaque.json",
  connectionStatus: "ready_to_pair",
  publicMode: false,
  commandPreferences: "[]",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("NEP BOT protected procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a profile only from a server-validated E.164 result", async () => {
    serviceMock.validatePhoneNumber.mockResolvedValue({
      valid: true,
      e164: "+9779841234567",
      countryIso: "NP",
      dialCode: "977",
      nationalFormatted: "984-1234567",
    });
    dbMock.createBotProfile.mockResolvedValue(profile);

    const result = await createCaller().bot.create({
      botName: "NEP Support",
      countryIso: "NP",
      countryDialCode: "+977",
      nationalNumber: "984 123 4567",
    });

    expect(result).toEqual(expect.objectContaining({ id: 77, phoneE164: "+9779841234567" }));
    expect(result).not.toHaveProperty("sessionStorageKey");
    expect(dbMock.createBotProfile).toHaveBeenCalledWith(expect.objectContaining({ phoneE164: "+9779841234567", ownerId: 23 }));
    expect(dbMock.addActivity).toHaveBeenCalledWith(77, "profile_created", expect.any(String));
  });

  it("does not request a pairing code for a profile the owner cannot access", async () => {
    dbMock.getBotProfileForOwner.mockResolvedValue(undefined);

    await expect(createCaller().bot.requestPairing({ profileId: 77 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(connectorMock.requestPairing).not.toHaveBeenCalled();
  });

  it("records a safe error state when the linked-device connector cannot issue a code", async () => {
    dbMock.getBotProfileForOwner.mockResolvedValue(profile);
    connectorMock.requestPairing.mockRejectedValue(new Error("Connector unavailable"));

    await expect(createCaller().bot.requestPairing({ profileId: 77 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(dbMock.updateBotProfile).toHaveBeenCalledWith(77, { connectionStatus: "error" });
    expect(dbMock.addActivity).toHaveBeenCalledWith(77, "pairing_failed", expect.any(String));
  });

  it("syncs a verified connector state and records only a non-sensitive activity summary", async () => {
    dbMock.getBotProfileForOwner.mockResolvedValue(profile);
    connectorMock.getStatus.mockResolvedValue({ configured: true, connectionStatus: "connected" });

    await expect(createCaller().bot.syncStatus({ profileId: 77 })).resolves.toEqual({ configured: true, connectionStatus: "connected", error: undefined });
    expect(dbMock.updateBotProfile).toHaveBeenCalledWith(77, { connectionStatus: "connected" });
    expect(dbMock.addActivity).toHaveBeenCalledWith(77, "connection_status_updated", "Connector status updated to connected.");
  });
});
