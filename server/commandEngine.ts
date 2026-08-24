export type CommandAction =
  | { kind: "mode"; publicMode: boolean }
  | { kind: "feature"; feature: "antiLink" | "antiCall" | "autoRead" | "autoReact" | "groupControls" | "aiAutoReply"; enabled: boolean }
  | { kind: "ai"; prompt: string };

export type CommandContext = {
  isOwner: boolean;
  publicMode: boolean;
  connectionStatus: string;
  botName: string;
  senderId?: string;
  uptimeSeconds?: number;
  enabledFeatures?: string[];
};

export type CommandResult = {
  handled: boolean;
  response?: string;
  action?: CommandAction;
  command?: string;
};

const publicCommands = new Set(["/hi", "/help", "/menu", "/commands", "/ping", "/status", "/about", "/joke", "/roast", "/quote", "/fact", "/rules", "/id", "/meme", "/translate", "/time", "/date", "/dice", "/flip", "/8ball", "/choose", "/echo", "/version", "/privacy", "/support"]);
const ownerCommands = new Set(["/public", "/private", "/lock", "/unlock", "/mode", "/antilink", "/anticall", "/autoread", "/autoreact", "/groupmode", "/autoreply", "/group", "/media", "/ai", "/uptime", "/settings", "/features", "/automations", "/diagnostics", "/profile", "/activity", "/reconnect", "/disconnect"]);

export const commandDefinitions = [
  { command: "/hi", group: "Essentials", description: "Greeting and quick start.", access: "Public" },
  { command: "/help or /menu", group: "Essentials", description: "Show available commands.", access: "Public" },
  { command: "/ping", group: "Utilities", description: "Check whether the command listener is responsive.", access: "Public" },
  { command: "/status", group: "Utilities", description: "Show connection and command-mode state.", access: "Public" },
  { command: "/roast [name]", group: "Fun", description: "Friendly, non-abusive roast.", access: "Public" },
  { command: "/joke · /quote · /fact", group: "Fun", description: "Short safe text responses.", access: "Public" },
  { command: "/dice · /flip · /8ball · /choose", group: "Fun", description: "Safe interactive utility responses.", access: "Public" },
  { command: "/time · /date · /version · /privacy", group: "Utilities", description: "Basic bot information and privacy guidance.", access: "Public" },
  { command: "/translate [text]", group: "Utilities", description: "Translation helper guidance.", access: "Public" },
  { command: "/public · /private · /lock · /unlock", group: "Owner controls", description: "Set who can run public commands.", access: "Owner" },
  { command: "/antilink on|off", group: "Moderation", description: "Set approved group link moderation.", access: "Owner" },
  { command: "/anticall · /groupmode on|off", group: "Moderation", description: "Set call handling and approved group controls.", access: "Owner" },
  { command: "/autoread · /autoreact · /autoreply", group: "Automation", description: "Set safe response automations.", access: "Owner" },
  { command: "/features · /automations · /diagnostics", group: "Owner controls", description: "Inspect configured safeguards and listener state.", access: "Owner" },
  { command: "/profile · /activity · /reconnect", group: "Owner controls", description: "Review profile and session guidance.", access: "Owner" },
  { command: "/ai [prompt] · /media [url]", group: "Provider features", description: "Use configured approved providers only.", access: "Owner" },
] as const;

export function parseCommand(input: string) {
  const normalized = input.trim();
  if (!/^[/.]/.test(normalized)) return null;
  const [rawCommand, ...rest] = normalized.split(/\s+/);
  const command = `/${rawCommand.slice(1).toLowerCase()}`;
  return { command, argument: rest.join(" ").trim().slice(0, 300) };
}

function toggleArgument(argument: string, usage: string): { enabled?: boolean; usage?: string } {
  const mode = argument.toLowerCase();
  if (mode === "on") return { enabled: true };
  if (mode === "off") return { enabled: false };
  return { usage };
}

export function executeCommand(rawText: string, context: CommandContext): CommandResult {
  const parsed = parseCommand(rawText);
  if (!parsed) return { handled: false };
  const { command, argument } = parsed;
  if (!publicCommands.has(command) && !ownerCommands.has(command)) {
    return { handled: true, command, response: "Unknown command. Send /menu to see NEP BOT commands." };
  }
  if (ownerCommands.has(command) && !context.isOwner) {
    return { handled: true, command, response: "This command is available to the bot owner only." };
  }
  if (publicCommands.has(command) && !context.publicMode && !context.isOwner) {
    return { handled: true, command, response: "This bot is currently in private owner-only mode." };
  }

  const menu = "Commands: /hi, /help, /ping, /status, /joke, /roast [name], /quote, /fact, /dice, /flip, /8ball [question], /choose a|b, /time, /date, /echo [text], /translate [text]. Owner: /public, /private, /features, /diagnostics, /antilink on|off, /anticall on|off, /groupmode on|off, /autoread on|off, /autoreact on|off, /autoreply on|off, /ai [prompt].";
  if (command === "/hi") return { handled: true, command, response: `Hi! I am ${context.botName}. Send /menu to see what I can do.` };
  if (command === "/help" || command === "/menu" || command === "/commands") return { handled: true, command, response: menu };
  if (command === "/ping") return { handled: true, command, response: "Pong. NEP BOT command listener is active." };
  if (command === "/status") return { handled: true, command, response: `${context.botName} status: ${context.connectionStatus.replace(/_/g, " ")}. Command mode: ${context.publicMode ? "public" : "owner-only"}.` };
  if (command === "/about") return { handled: true, command, response: "NEP BOT is an owner-controlled WhatsApp assistant with safe commands and clear moderation controls." };
  if (command === "/joke") return { handled: true, command, response: "Why did the bot bring a ladder? It wanted to reach a higher API." };
  if (command === "/roast") return { handled: true, command, response: `${argument || "You"}, your confidence has better uptime than your Wi-Fi. Friendly roast only.` };
  if (command === "/quote") return { handled: true, command, response: "Small steps, clear controls, reliable progress." };
  if (command === "/fact") return { handled: true, command, response: "A paired linked-device session still needs the phone owner to confirm the link." };
  if (command === "/rules") return { handled: true, command, response: "Please be respectful. NEP BOT avoids bulk messaging, abuse, and unsafe media handling." };
  if (command === "/id") return { handled: true, command, response: context.senderId ? `Your chat identifier: ${context.senderId}` : "Your chat identifier is unavailable in this message." };
  if (command === "/meme") return { handled: true, command, response: "Meme delivery needs an approved media provider. Text command handling is online." };
  if (command === "/translate") return { handled: true, command, response: argument ? `Translation request received: ${argument}. Configure an approved translation provider to return a translated result.` : "Usage: /translate [text]" };
  if (command === "/time" || command === "/date") return { handled: true, command, response: new Date().toLocaleString("en-US", { dateStyle: command === "/date" ? "full" : "medium", timeStyle: command === "/time" ? "short" : undefined, timeZone: "UTC" }) + " UTC" };
  if (command === "/dice") return { handled: true, command, response: `🎲 You rolled ${Math.floor(Math.random() * 6) + 1}.` };
  if (command === "/flip") return { handled: true, command, response: `🪙 ${Math.random() < 0.5 ? "Heads" : "Tails"}.` };
  if (command === "/8ball") return { handled: true, command, response: argument ? ["Signs point to yes.", "Ask again after a short pause.", "The outlook is promising.", "Better not tell you now."][argument.length % 4] : "Usage: /8ball [question]" };
  if (command === "/choose") {
    const choices = argument.split("|").map((item) => item.trim()).filter(Boolean).slice(0, 8);
    return { handled: true, command, response: choices.length >= 2 ? `I choose: ${choices[Math.floor(Math.random() * choices.length)]}.` : "Usage: /choose option A | option B" };
  }
  if (command === "/echo") return { handled: true, command, response: argument ? argument : "Usage: /echo [text]" };
  if (command === "/version") return { handled: true, command, response: "NEP BOT command suite: linked-device control edition." };
  if (command === "/privacy") return { handled: true, command, response: "NEP BOT keeps credentials and session material server-side. It does not include bulk messaging workflows." };
  if (command === "/support") return { handled: true, command, response: "For bot setup, use the owner dashboard to review pairing, connection health, and feature switches." };
  if (command === "/public" || command === "/unlock") return { handled: true, command, response: "Public command mode enabled.", action: { kind: "mode", publicMode: true } };
  if (command === "/private" || command === "/lock") return { handled: true, command, response: "Private owner-only mode enabled.", action: { kind: "mode", publicMode: false } };
  if (command === "/mode") return { handled: true, command, response: `Command mode is ${context.publicMode ? "public" : "owner-only"}.` };
  if (command === "/group") return { handled: true, command, response: "Group controls are managed from the owner dashboard and apply only where you approve them." };
  if (command === "/settings" || command === "/features" || command === "/automations") return { handled: true, command, response: `Mode: ${context.publicMode ? "public" : "owner-only"}. Connection: ${context.connectionStatus.replace(/_/g, " ")}. Enabled features: ${context.enabledFeatures?.length ? context.enabledFeatures.join(", ") : "none"}.` };
  if (command === "/diagnostics") return { handled: true, command, response: `Diagnostics: listener ${context.connectionStatus.replace(/_/g, " ")}; uptime ${Math.max(0, Math.floor((context.uptimeSeconds ?? 0) / 60))} minutes; command syntax /command or .command.` };
  if (command === "/profile") return { handled: true, command, response: `Profile: ${context.botName}. Mode: ${context.publicMode ? "public" : "owner-only"}. Use the owner dashboard for private connection details.` };
  if (command === "/activity") return { handled: true, command, response: "Recent non-sensitive bot activity is available in the owner dashboard." };
  if (command === "/reconnect" || command === "/disconnect") return { handled: true, command, response: "For secure session changes, use Refresh connector status or Secure logout in the owner dashboard." };
  if (command === "/uptime") return { handled: true, command, response: `Connector process uptime: ${Math.max(0, Math.floor((context.uptimeSeconds ?? 0) / 60))} minutes.` };
  if (command === "/media") return { handled: true, command, response: "Media helpers require an approved provider and do not fetch untrusted links by default." };
  if (command === "/ai") return argument ? { handled: true, command, action: { kind: "ai", prompt: argument } } : { handled: true, command, response: "Usage: /ai [prompt]" };

  const features: Record<string, CommandAction["kind"]> = { "/antilink": "feature", "/anticall": "feature", "/autoread": "feature", "/autoreact": "feature", "/groupmode": "feature", "/autoreply": "feature" };
  if (features[command] === "feature") {
    const names = { "/antilink": "antiLink", "/anticall": "antiCall", "/autoread": "autoRead", "/autoreact": "autoReact", "/groupmode": "groupControls", "/autoreply": "aiAutoReply" } as const;
    const check = toggleArgument(argument, `Usage: ${command} on|off`);
    if (check.usage) return { handled: true, command, response: check.usage };
    const feature = names[command as keyof typeof names];
    return { handled: true, command, response: `${command.slice(1)} ${check.enabled ? "enabled" : "disabled"}.`, action: { kind: "feature", feature, enabled: Boolean(check.enabled) } };
  }
  return { handled: true, command, response: "Command could not be completed." };
}
