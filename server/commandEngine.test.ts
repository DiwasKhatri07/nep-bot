import { describe, expect, it } from "vitest";
import { executeCommand, parseCommand } from "./commandEngine";

const publicContext = {
  isOwner: false,
  publicMode: true,
  connectionStatus: "connected",
  botName: "NEP BOT",
  senderId: "9779800000000",
  uptimeSeconds: 120,
};

describe("NEP BOT command engine", () => {
  it("parses both slash and dot command syntax", () => {
    expect(parseCommand("/roast Alex")).toEqual({ command: "/roast", argument: "Alex" });
    expect(parseCommand(".PING")).toEqual({ command: "/ping", argument: "" });
    expect(parseCommand("/नमस्ते")).toEqual({ command: "/hi", argument: "" });
    expect(parseCommand("/भाषा ne")).toEqual({ command: "/language", argument: "ne" });
    expect(parseCommand("normal chat")).toBeNull();
  });

  it("returns a reply for public commands and informative unknown commands", () => {
    expect(executeCommand("/hi", publicContext).response).toContain("NEP BOT");
    expect(executeCommand(".ping", publicContext).response).toContain("Pong");
    expect(executeCommand("/does-not-exist", publicContext).response).toContain("Unknown command");
  });

  it("returns clear feedback for non-owner users when private mode is enabled", () => {
    const result = executeCommand("/joke", { ...publicContext, publicMode: false });
    expect(result.response).toContain("private owner-only mode");
  });

  it("allows an owner to enact mode and moderation feature changes", () => {
    const ownerContext = { ...publicContext, isOwner: true, publicMode: false };
    expect(executeCommand("/public", ownerContext).action).toEqual({ kind: "mode", publicMode: true });
    expect(executeCommand("/antilink on", ownerContext).action).toEqual({ kind: "feature", feature: "antiLink", enabled: true });
    expect(executeCommand("/anticall off", ownerContext).action).toEqual({ kind: "feature", feature: "antiCall", enabled: false });
    expect(executeCommand("/welcome on", ownerContext).action).toEqual({ kind: "feature", feature: "welcomeMessage", enabled: true });
    expect(executeCommand("/pmreply on", ownerContext).action).toEqual({ kind: "feature", feature: "privateAutoReply", enabled: true });
    expect(executeCommand("/statusreply on", ownerContext).action).toEqual({ kind: "feature", feature: "statusReply", enabled: true });
  });

  it("keeps provider-backed AI and media features owner-scoped", () => {
    expect(executeCommand("/ai hello", publicContext).response).toContain("owner only");
    expect(executeCommand("/ai hello", { ...publicContext, isOwner: true }).action).toEqual({ kind: "ai", prompt: "hello" });
    expect(executeCommand("/media https://example.com", { ...publicContext, isOwner: true }).response).toContain("approved provider");
  });

  it("handles expanded public utility and interaction commands", () => {
    expect(executeCommand("/echo hello team", publicContext).response).toBe("hello team");
    expect(executeCommand("/choose green | blue", publicContext).response).toMatch(/^I choose: (green|blue)\.$/);
    expect(executeCommand("/8ball will it work", publicContext).response).toBeTruthy();
    expect(executeCommand("/privacy", publicContext).response).toContain("server-side");
  });

  it("allows the owner to control expanded automations and inspect diagnostics", () => {
    const ownerContext = { ...publicContext, isOwner: true, enabledFeatures: ["antiLink", "commandAudit"] };
    expect(executeCommand("/groupmode on", ownerContext).action).toEqual({ kind: "feature", feature: "groupControls", enabled: true });
    expect(executeCommand("/autoreply off", ownerContext).action).toEqual({ kind: "feature", feature: "aiAutoReply", enabled: false });
    expect(executeCommand("/features", ownerContext).response).toContain("antiLink");
    expect(executeCommand("/diagnostics", ownerContext).response).toContain("listener");
  });

  it("returns Nepali core responses and lets the owner change the command language", () => {
    const nepaliContext = { ...publicContext, language: "ne" as const };
    expect(executeCommand("/नमस्ते", nepaliContext).response).toContain("नमस्ते");
    expect(executeCommand("/मेनु", nepaliContext).response).toContain("कमाण्डहरू");
    expect(executeCommand("/भाषा en", { ...nepaliContext, isOwner: true }).action).toEqual({ kind: "language", language: "en" });
  });
});
