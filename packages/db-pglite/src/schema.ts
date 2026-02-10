import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  invite_code: varchar("invite_code", { length: 20 }).notNull().unique(),
  created_by: uuid("created_by").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    team_id: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 10 }).notNull().$type<"owner" | "admin" | "member">(),
    joined_at: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("team_members_team_user_idx").on(table.team_id, table.user_id)]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    team_id: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("projects_team_slug_idx").on(table.team_id, table.slug)]
);

export const environments = pgTable(
  "environments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    project_id: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("environments_project_slug_idx").on(table.project_id, table.slug)]
);

export const secrets = pgTable(
  "secrets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    environment_id: uuid("environment_id").notNull().references(() => environments.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 256 }).notNull(),
    encrypted_value: text("encrypted_value").notNull(),
    version: integer("version").notNull().default(1),
    updated_by: uuid("updated_by").notNull().references(() => users.id),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("secrets_env_key_idx").on(table.environment_id, table.key)]
);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  team_id: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  resource_type: varchar("resource_type", { length: 50 }).notNull(),
  resource_id: varchar("resource_id", { length: 100 }).notNull(),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const cliTokens = pgTable("cli_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  token_hash: varchar("token_hash", { length: 64 }).notNull().unique(),
  last_used_at: timestamp("last_used_at"),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
