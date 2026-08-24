import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import P from "pino";
import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, useMultiFileAuthState } from "@whiskeysockets/baileys";
import type { BotProfile } from "../drizzle/schema";
import * as db from "./db";
import { generateAiReply } from "./botService";
import { executeCommand } from "./commandEngine";
import { storageGetSignedUrl, storagePut } from "./storage";

type ConnectionStatus = "ready_to_pair" | "pairing" | "connected" | "disconnected" | "error";

type ConnectorSession = {
  profileId: number;
  authDir: string;
  socket: ReturnType<typeof makeWASocket>;
  status: ConnectionStatus;
  ready: Promise<void>;
  persistTimer?: NodeJS.Timeout;
};

type Snapshot = { version: 1; files: Record<string, string> };

const runtimeRoot = "/tmp/nep-bot-sessions";

function encryptionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to protect connector sessions.");
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({ version: 1, iv: iv.toString("base64"), tag: tag.toString("base64"), ciphertext: encrypted.toString("base64") });
}

function decrypt(value: string) {
  const payload = JSON.parse(value) as { version: number; iv: string; tag: string; ciphertext: string };
  if (payload.version !== 1) throw new Error("Unsupported connector session format.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

async function collectFiles(directory: string, relative = ""): Promise<Record<string, string>> {
  const output: Record<string, string> = {};
  const entries = await fs.readdir(path.join(directory, relative), { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(output, await collectFiles(directory, rel));
    else if (entry.isFile()) output[rel] = await fs.readFile(path.join(directory, rel), "utf8");
  }
  return output;
}

async function restoreSnapshot(directory: string, storageKey?: string | null) {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
  if (!storageKey) return;
  const signedUrl = await storageGetSignedUrl(storageKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("Stored connector session could not be loaded.");
  const snapshot = JSON.parse(decrypt(await response.text())) as Snapshot;
  if (snapshot.version !== 1) throw new Error("Stored connector session is not supported.");
  await Promise.all(Object.entries(snapshot.files).map(async ([relative, contents]) => {
    if (relative.includes("..") || path.isAbsolute(relative)) throw new Error("Invalid connector session path.");
    const target = path.join(directory, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents, "utf8");
  }));
}

async function persistSnapshot(profileId: number, directory: string) {
  const snapshot: Snapshot = { version: 1, files: await collectFiles(directory) };
  const saved = await storagePut(`connector-sessions/${profileId}/auth.json`, encrypt(JSON.stringify(snapshot)), "application/octet-stream");
  await db.updateSessionStorageKey(profileId, saved.key);
}

function safeText(message: any) {
  return String(message?.conversation || message?.extendedTextMessage?.text || "").trim().slice(0, 500);
}

function stripPhone(value: string) {
  return value.replace(/\D/g, "");
}

class WhatsAppConnector {
  private sessions = new Map<number, ConnectorSession>();

  private async setStatus(profileId: number, status: ConnectionStatus, summary?: string) {
    const current = this.sessions.get(profileId);
    if (current) current.status = status;
    await db.updateBotProfile(profileId, { connectionStatus: status });
    if (summary) await db.addActivity(profileId, "connector_status", summary);
  }

  private schedulePersist(session: ConnectorSession) {
    if (session.persistTimer) clearTimeout(session.persistTimer);
    session.persistTimer = setTimeout(() => {
      persistSnapshot(session.profileId, session.authDir).catch(() => undefined);
    }, 700);
  }

  private async respondToMessage(profile: BotProfile, session: ConnectorSession, event: any) {
    if (event.type !== "notify") return;
    for (const message of event.messages ?? []) {
      if (!message.message) continue;
      const from = message.key.remoteJid;
      if (!from || from === "status@broadcast") continue;
      const text = safeText(message.message);
      const fromMe = message.key.fromMe === true;
      const features = await db.getFeatureSettings(profile.id);
      if (!fromMe && features?.autoRead) await session.socket.readMessages([message.key]).catch(() => undefined);
      if (!fromMe && features?.autoReact) await session.socket.sendMessage(from, { react: { text: "🤖", key: message.key } }).catch(() => undefined);
      const isGroup = from.endsWith("@g.us");
      if (!fromMe && isGroup && features?.antiLink && /(?:https?:\/\/|chat\.whatsapp\.com\/|www\.)/i.test(text)) {
        await session.socket.sendMessage(from, { delete: message.key }).catch(() => undefined);
        continue;
      }
      if (!fromMe && features?.aiAutoReply && !isGroup && text && !text.startsWith("/")) {
        const ai = await generateAiReply(text).catch(() => ({ status: "llm_error" as const }));
        if (ai.status === "ok" && ai.response) {
          await session.socket.sendMessage(from, { text: ai.response }, { quoted: message }).catch(() => undefined);
        }
        continue;
      }
      const ownerNumber = stripPhone(profile.phoneE164);
      const senderNumber = stripPhone(String(message.key.participant || from).split("@")[0]);
      const isOwner = fromMe || senderNumber === ownerNumber;
      const result = executeCommand(text, {
        isOwner,
        publicMode: profile.publicMode,
        connectionStatus: session.status,
        botName: profile.botName,
        senderId: senderNumber || undefined,
        uptimeSeconds: process.uptime(),
      });
      if (!result.handled) continue;
      const reply = async (value: string) => session.socket.sendMessage(from, { text: value }, { quoted: message }).catch(() => undefined);
      if (result.action?.kind === "mode") {
        await db.updateBotProfile(profile.id, { publicMode: result.action.publicMode });
        await db.addActivity(profile.id, "mode_updated", result.action.publicMode ? "Public command mode enabled from WhatsApp." : "Private owner-only mode enabled from WhatsApp.");
      }
      if (result.action?.kind === "feature") {
        await db.updateFeatureSettings(profile.id, { [result.action.feature]: result.action.enabled });
        await db.addActivity(profile.id, "features_updated", `${result.action.feature} ${result.action.enabled ? "enabled" : "disabled"} from WhatsApp.`);
      }
      if (result.action?.kind === "ai") {
        const ai = await generateAiReply(result.action.prompt).catch(() => ({ status: "llm_error" as const, error: "AI provider request failed." }));
        await reply(ai.status === "ok" && ai.response ? ai.response : ai.error || "AI provider is not configured.");
      } else if (result.response) {
        await reply(result.response);
      }
      if (result.command) {
        await db.addActivity(profile.id, "command_handled", `Handled ${result.command} from ${isOwner ? "owner" : "chat"}.`);
      }
    }
  }

  private async start(profile: BotProfile) {
    const existing = this.sessions.get(profile.id);
    if (existing) return existing;
    const authDir = path.join(runtimeRoot, String(profile.id));
    await restoreSnapshot(authDir, profile.sessionStorageKey);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    let resolveReady: () => void = () => undefined;
    const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
    const socket = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })) },
      logger: P({ level: "silent" }),
      browser: Browsers.ubuntu("Chrome"),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
    });
    const session: ConnectorSession = { profileId: profile.id, authDir, socket, status: profile.connectionStatus as ConnectionStatus, ready };
    this.sessions.set(profile.id, session);
    socket.ev.on("creds.update", async () => {
      await saveCreds();
      this.schedulePersist(session);
    });
    socket.ev.on("messages.upsert", (event) => { this.respondToMessage(profile, session, event).catch(() => undefined); });
    socket.ev.on("call", async (calls) => {
      const features = await db.getFeatureSettings(profile.id);
      if (!features?.antiCall) return;
      for (const call of calls) {
        if (call.status !== "offer") continue;
        await socket.rejectCall(call.id, call.from).catch(() => undefined);
        await socket.sendMessage(call.from, { text: "Calls are disabled for this NEP BOT profile. Please send a message instead." }).catch(() => undefined);
      }
    });
    socket.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
      if (qr || connection === "open") resolveReady();
      if (connection === "open") {
        await this.setStatus(profile.id, "connected", "WhatsApp linked-device session connected.");
        this.schedulePersist(session);
      }
      if (connection === "close") {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut || code === 401;
        this.sessions.delete(profile.id);
        await this.setStatus(profile.id, loggedOut ? "disconnected" : "error", loggedOut ? "WhatsApp session logged out." : "WhatsApp connector connection closed.");
      }
    });
    return session;
  }

  async requestPairing(profile: BotProfile) {
    const session = await this.start(profile);
    await Promise.race([session.ready, new Promise((_, reject) => setTimeout(() => reject(new Error("Connector did not become ready for pairing.")), 15000))]);
    const number = stripPhone(profile.phoneE164);
    if (session.socket.authState.creds.registered) {
      throw new Error("This profile is already paired. Use secure logout before re-pairing.");
    }
    await this.setStatus(profile.id, "pairing", "A temporary pairing code was requested by the owner.");
    const pairingCode = await session.socket.requestPairingCode(number);
    return { pairingCode, expiresInSeconds: 60 };
  }

  async getStatus(profile: BotProfile) {
    const active = this.sessions.get(profile.id);
    if (active) return { configured: true, connectionStatus: active.status };
    if (profile.sessionStorageKey) {
      this.start(profile).catch(() => undefined);
      return { configured: true, connectionStatus: "disconnected" as const };
    }
    return { configured: true, connectionStatus: profile.connectionStatus === "error" ? "ready_to_pair" as const : profile.connectionStatus as ConnectionStatus };
  }

  async restorePersistedSessions() {
    const profiles = await db.listRestorableBotProfiles();
    await Promise.all(profiles.map(async (profile) => {
      try {
        await this.start(profile);
      } catch {
        await db.updateBotProfile(profile.id, { connectionStatus: "error" });
        await db.addActivity(profile.id, "connector_restore_failed", "Stored linked-device session could not be restored.");
      }
    }));
  }

  async disconnect(profile: BotProfile) {
    const active = this.sessions.get(profile.id);
    if (!active) throw new Error("No active connector session is available to disconnect.");
    await active.socket.logout();
    this.sessions.delete(profile.id);
    await db.updateSessionStorageKey(profile.id, null);
    await fs.rm(active.authDir, { recursive: true, force: true });
    await this.setStatus(profile.id, "disconnected", "Owner requested a secure connector logout.");
    return { success: true };
  }
}

export const whatsappConnector = new WhatsAppConnector();
