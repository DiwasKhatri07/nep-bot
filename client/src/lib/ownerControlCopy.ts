export function localizedOwnerControlCopy(copy: string, language: "en" | "ne" | undefined) {
  const [english, nepali] = copy.split(" · ");
  return language === "ne" && nepali ? nepali : english;
}
