export const commandCatalog = [
  { command: "/hi", group: "Essentials", description: "Send a quick NEP BOT greeting.", access: "Public" },
  { command: "/roast [name]", group: "Essentials", description: "Send a lighthearted, non-abusive roast.", access: "Public" },
  { command: "/menu", group: "Essentials", description: "Open the organized command menu.", access: "Public" },
  { command: "/joke", group: "Fun", description: "Share a short joke.", access: "Public" },
  { command: "/meme", group: "Fun", description: "Fetch a moderated meme response.", access: "Public" },
  { command: "/translate [text]", group: "Utilities", description: "Translate a short message.", access: "Public" },
  { command: "/media [url]", group: "Utilities", description: "Process approved media links when enabled.", access: "Owner" },
  { command: "/ai [prompt]", group: "AI", description: "Run an AI query when a provider is configured.", access: "Owner" },
  { command: "/public", group: "Owner controls", description: "Allow public bot commands.", access: "Owner" },
  { command: "/private", group: "Owner controls", description: "Restrict bot commands to the owner.", access: "Owner" },
  { command: "/antilink on|off", group: "Moderation", description: "Manage link moderation in approved groups.", access: "Owner" },
  { command: "/group", group: "Moderation", description: "Access enabled group utilities.", access: "Owner" },
] as const;
