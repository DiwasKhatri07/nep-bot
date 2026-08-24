import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const botProfiles = mysqlTable("bot_profiles", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  botName: varchar("botName", { length: 64 }).notNull(),
  phoneE164: varchar("phoneE164", { length: 20 }).notNull(),
  countryIso: varchar("countryIso", { length: 2 }).notNull(),
  countryDialCode: varchar("countryDialCode", { length: 8 }).notNull(),
  nationalNumber: varchar("nationalNumber", { length: 32 }).notNull(),
  sessionStorageKey: varchar("sessionStorageKey", { length: 512 }),
  connectionStatus: mysqlEnum("connectionStatus", ["draft", "ready_to_pair", "pairing", "connected", "disconnected", "error"]).default("draft").notNull(),
  publicMode: boolean("publicMode").default(false).notNull(),
  commandPreferences: text("commandPreferences").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const botFeatureSettings = mysqlTable("bot_feature_settings", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().unique().references(() => botProfiles.id, { onDelete: "cascade" }),
  antiLink: boolean("antiLink").default(false).notNull(),
  antiCall: boolean("antiCall").default(false).notNull(),
  autoRead: boolean("autoRead").default(false).notNull(),
  autoReact: boolean("autoReact").default(false).notNull(),
  groupControls: boolean("groupControls").default(false).notNull(),
  aiAutoReply: boolean("aiAutoReply").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const botActivity = mysqlTable("bot_activity", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => botProfiles.id, { onDelete: "cascade" }),
  eventType: varchar("eventType", { length: 48 }).notNull(),
  summary: varchar("summary", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BotProfile = typeof botProfiles.$inferSelect;
export type InsertBotProfile = typeof botProfiles.$inferInsert;
export type BotFeatureSettings = typeof botFeatureSettings.$inferSelect;
