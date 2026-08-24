import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AntiCallReplyControl } from "../client/src/components/AntiCallReplyControl";

describe("rendered anti-call owner control localization", () => {
  it("renders distinct Nepali and English labels and selector options by profile language", () => {
    const nepali = renderToStaticMarkup(createElement(AntiCallReplyControl, { language: "ne", value: "localized", disabled: false, onChange: () => undefined }));
    const english = renderToStaticMarkup(createElement(AntiCallReplyControl, { language: "en", value: "localized", disabled: false, onChange: () => undefined }));
    expect(nepali).toContain("कल प्रतिक्रिया");
    expect(nepali).toContain("भाषाअनुसार सुरक्षित जवाफ");
    expect(nepali).toContain("चुपचाप अस्वीकार");
    expect(english).toContain("Anti-call reply");
    expect(english).toContain("Localized safe reply");
    expect(english).toContain("Silent rejection");
  });
});
