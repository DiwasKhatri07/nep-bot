export type CommandAction =
  | { kind: "mode"; publicMode: boolean }
  | { kind: "feature"; feature: "antiLink" | "antiCall" | "autoRead" | "autoReact" | "groupControls"; enabled: boolean }
  | { kind: "ai"; prompt: string };

export type CommandContext = {
  isOwner: boolean;
  publicMode: boolean;
  connectionStatus: string;
  botName: string;
  senderId?: string;
  uptimeSeconds?: number;
};

export type CommandResult = {
  handled: boolean;
  response?: string;
  action?: CommandAction;
  command?: string;
};

const publicCommands = new Set(["/hi", "/help", "/menu", "/commands", "/ping", "/status", "/about", "/joke", "/roast", "/quote", "/fact", "/rules", "/id", "/meme", "/translate"]);
const ownerCommands = new Set(["/public", "/private", "/antilink", "/anticall", "/autoread", "/autoreact", "/group", "/media", "/ai", "/uptime", "/settings"]);

export const commandDefinitions = [
  { command: "/hi", group: "Essentials", description: "Greeting and quick start.", access: "Public" },
  { command: "/help or /menu", group: "Essentials", description: "Show available commands.", access: "Public" },
  { command: "/ping", group: "Utilities", description: "Check whether the command listener is responsive.", access: "Public" },
  { command: "/status", group: "Utilities", description: "Show connection and command-mode state.", access: "Public" },
  { command: "/roast [name]", group: "Fun", description: "Friendly, non-abusive roast.", access: "Public" },
  { command: "/joke · /quote · /fact", group: "Fun", description: "Short safe text responses.", access: "Public" },
  { command: "/translate [text]", group: "Utilities", description: "Translation helper guidance.", access: "Public" },
  { command: "/public · /private", group: "Owner controls", description: "Set who can run public commands.", access: "Owner" },
  { command: "/antilink on|off", group: "Moderation", description: "Set approved group link moderation.", access: "Owner" },
  { command: "/anticall on|off", group: "Moderation", description: "Set controlled incoming-call handling.", access: "Owner" },
  { command: "/autoread on|off", group: "Automation", description: "Set eligible message read receipts.", access: "Owner" },
  { command: "/autoreact on|off", group: "Automation", description: "Set safe reaction automation.", access: "Owner" },
  { command: "/group · /settings · /uptime", group: "Owner controls", description: "Show scoped connector and control status.", access: "Owner" },
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

  const menu = "Commands: /hi, /help, /ping, /status, /joke, /roast [name], /quote, /fact, /rules, /id, /translate [text]. Owner: /public, /private, /antilink on|off, /anticall on|off, /autoread on|off, /autoreact on|off, /group, /settings, /uptime, /ai [prompt].";
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
  if (command === "/public") return { handled: true, command, response: "Public command mode enabled.", action: { kind: "mode", publicMode: true } };
  if (command === "/private") return { handled: true, command, response: "Private owner-only mode enabled.", action: { kind: "mode", publicMode: false } };
  if (command === "/group") return { handled: true, command, response: "Group controls are managed from the owner dashboard and apply only where you approve them." };
  if (command === "/settings") return { handled: true, command, response: `Mode: ${context.publicMode ? "public" : "owner-only"}. Connection: ${context.connectionStatus.replace(/_/g, " ")}. Use the dashboard for feature switches.` };
  if (command === "/uptime") return { handled: true, command, response: `Connector process uptime: ${Math.max(0, Math.floor((context.uptimeSeconds ?? 0) / 60))} minutes.` };
  if (command === "/media") return { handled: true, command, response: "Media helpers require an approved provider and do not fetch untrusted links by default." };
  if (command === "/ai") return argument ? { handled: true, command, action: { kind: "ai", prompt: argument } } : { handled: true, command, response: "Usage: /ai [prompt]" };

  const features: Record<string, CommandAction["kind"]> = { "/antilink": "feature", "/anticall": "feature", "/autoread": "feature", "/autoreact": "feature" };
  if (features[command] === "feature") {
    const names = { "/antilink": "antiLink", "/anticall": "antiCall", "/autoread": "autoRead", "/autoreact": "autoReact" } as const;
    const check = toggleArgument(argument, `Usage: ${command} on|off`);
    if (check.usage) return { handled: true, command, response: check.usage };
    const feature = names[command as keyof typeof names];
    return { handled: true, command, response: `${command.slice(1)} ${check.enabled ? "enabled" : "disabled"}.`, action: { kind: "feature", feature, enabled: Boolean(check.enabled) } };
  }
  return { handled: true, command, response: "Command could not be completed." };
}
