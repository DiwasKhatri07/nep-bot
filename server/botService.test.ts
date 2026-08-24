import { describe, expect, it } from "vitest";

function normaliseNationalInput(value: string) {
  return value.replace(/\D/g, "");
}

function isSafeBotName(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9 _-]{1,63}$/.test(value.trim());
}

describe("NEP BOT input guards", () => {
  it("keeps only digits from a formatted national number", () => {
    expect(normaliseNationalInput("98 412-34567")).toBe("9841234567");
  });

  it("accepts readable bot profile names but rejects unsafe values", () => {
    expect(isSafeBotName("Nepal Support Bot")).toBe(true);
    expect(isSafeBotName("<script>")).toBe(false);
    expect(isSafeBotName("A")).toBe(false);
  });
});
