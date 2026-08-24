import { describe, expect, it } from "vitest";
import { localizedOwnerControlCopy } from "../client/src/lib/ownerControlCopy";

describe("profile-language-aware owner control copy", () => {
  it("uses Nepali owner-control copy for Nepali profiles and English for English profiles", () => {
    expect(localizedOwnerControlCopy("Anti-call · कल रोक्नुहोस्", "ne")).toBe("कल रोक्नुहोस्");
    expect(localizedOwnerControlCopy("Anti-call · कल रोक्नुहोस्", "en")).toBe("Anti-call");
  });
});
