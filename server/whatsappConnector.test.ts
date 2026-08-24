import { describe, expect, it } from "vitest";
import { whatsappConnector } from "./whatsappConnector";

describe("first-party WhatsApp connector", () => {
  it("loads without opening a linked-device session", () => {
    expect(whatsappConnector).toBeDefined();
    expect(typeof whatsappConnector.getStatus).toBe("function");
    expect(typeof whatsappConnector.requestPairing).toBe("function");
  });
});
