import React from "react";

type Props = {
  language?: "en" | "ne";
  value: "localized" | "silent";
  disabled: boolean;
  onChange: (value: "localized" | "silent") => void;
};

export function AntiCallReplyControl({ language, value, disabled, onChange }: Props) {
  const nepali = language === "ne";
  return <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
    <p className="text-sm font-semibold">{nepali ? "कल प्रतिक्रिया" : "Anti-call reply"}</p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{nepali ? "अस्वीकार गरिएको कलमा भाषाअनुसार सुरक्षित जवाफ वा चुपचाप अस्वीकार छान्नुहोस्।" : "Choose whether rejected calls receive a safe language-matched reply or are rejected silently."}</p>
    <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value as "localized" | "silent")} className="mt-4 h-10 w-full rounded-xl border border-input bg-background/60 px-3 text-xs outline-none focus:ring-2 focus:ring-ring">
      <option value="localized">{nepali ? "भाषाअनुसार सुरक्षित जवाफ" : "Localized safe reply"}</option>
      <option value="silent">{nepali ? "चुपचाप अस्वीकार" : "Silent rejection"}</option>
    </select>
  </div>;
}
