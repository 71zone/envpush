# Project: EnvPush (Self-hosted Environment Variable Manager)

## Overview

Build a monorepo for a **CLI-first**, self-hosted environment variable manager — a dead-simple, Doppler-like experience for small teams (<5 people). Everything happens in the terminal. No web dashboard. The system consists of an **API server** and a **CLI** that handles all operations: auth, team management, project setup, and secret management.

## Monorepo Structure (Turborepo + pnpm)

```
envpush/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── apps/
│   ├── server/          # Hono API server (dockerized, self-contained)
│   └── cli/             # CLI app (Citty + @clack/prompts)
├── packages/
│   ├── shared/          # Abstract DB interface, types, crypto utils, Zod schemas
│   ├── db-pglite/       # PGLite driver implementation (zero config, embedded Postgres)
│   └── tsconfig/        # Shared TypeScript configs
└── docker-compose.yml   # Single container, no external deps
```

## Tech Stack

| Layer        | Tech                                        |
| ------------ | ------------------------------------------- |
| Monorepo     | Turborepo + pnpm workspaces                 |
| Server       | Hono (Node.js)                              |
| Database     | PGLite (embedded Postgres, zero config, in-process)          |
| Auth         | JWT tokens for CLI auth                     |
| API layer    | Hono RPC (typed client from route definitions)|
| Encryption   | AES-256-GCM for secret values at rest       |
| CLI commands | Citty (UnJS) for command routing             |
| CLI prompts  | @clack/prompts for interactive flows         |
| CLI output   | chalk for colored/formatted output           |
| Shared       | Zod schemas, shared types, crypto helpers   |
| Deployment   | Docker + docker-compose                     |

## Data Model

### Users
- id (uuid), email, name, password_hash, created_at

### Teams
- id (uuid), name, invite_code (unique, regeneratable), created_by, created_at

### Team Members
- id (uuid), team_id, user_id, role (owner | admin | member), joined_at

### Projects
- id (uuid), team_id, name, slug, created_at

### Environments
- id (uuid), project_id, name (e.g., development, staging, production), slug, created_at

### Secrets
- id (uuid), environment_id, key, encrypted_value, version, updated_by, created_at, updated_at

### Audit Log
- id (uuid), team_id, user_id, action, resource_type, resource_id, metadata (jsonb), created_at

### CLI Tokens
- id (uuid), user_id, token_hash, last_used_at, expires_at, created_at

## Database Layer

### `@envpush/shared` — Abstract Interface

Contains the database contract that all drivers must implement, plus shared types, Zod schemas, crypto utils, and constants.

```typescript
// packages/shared/src/db.ts

export interface EnvpushDatabase {
  users: {
    create(data: CreateUser): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
  };
  teams: {
    create(data: CreateTeam): Promise<Team>;
    findById(id: string): Promise<Team | null>;
    findByInviteCode(code: string): Promise<Team | null>;
    findByUserId(userId: string): Promise<Team[]>;
    regenerateInviteCode(teamId: string): Promise<string>;
  };
  teamMembers: {
    add(data: AddMember): Promise<TeamMember>;
    findByTeamId(teamId: string): Promise<TeamMember[]>;
    updateRole(teamId: string, userId: string, role: Role): Promise<void>;
    remove(teamId: string, userId: string): Promise<void>;
  };
  projects: {
    create(data: CreateProject): Promise<Project>;
    findByTeamId(teamId: string): Promise<Project[]>;
    findBySlug(slug: string): Promise<Project | null>;
    delete(id: string): Promise<void>;
  };
  environments: {
    create(data: CreateEnvironment): Promise<Environment>;
    findByProjectId(projectId: string): Promise<Environment[]>;
    delete(id: string): Promise<void>;
  };
  secrets: {
    findByEnvironmentId(envId: string): Promise<Secret[]>;
    upsertMany(envId: string, secrets: UpsertSecret[], updatedBy: string): Promise<void>;
    delete(envId: string, key: string): Promise<void>;
  };
  auditLog: {
    create(data: CreateAuditLog): Promise<void>;
    findByTeamId(teamId: string, opts?: { limit?: number; offset?: number }): Promise<AuditEvent[]>;
  };
  cliTokens: {
    create(data: CreateCLIToken): Promise<CLIToken>;
    findByTokenHash(hash: string): Promise<CLIToken | null>;
    updateLastUsed(id: string): Promise<void>;
    delete(id: string): Promise<void>;
  };
}

export interface EnvpushDbConfig {
  /** Connection string (e.g., "postgresql://...", "./data/envpush") */
  connectionString?: string;
  /** Enable debug/verbose logging */
  debug?: boolean;
}
```

### `@envpush/db-pglite` — PGLite Driver

Embedded Postgres running in-process via PGLite. Zero config — auto-creates database in a local folder on first run.

```typescript
// packages/db-pglite/src/index.ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { EnvpushDatabase, EnvpushDbConfig } from "@envpush/shared";
import * as schema from "./schema";
// ... query implementations

const DEFAULT_CONNECTION_STRING = "./data/envpush";

/**
 * Create an EnvPush database instance using PGLite (embedded Postgres).
 *
 * @param config - Optional configuration. Defaults to local `./data/envpush/` directory.
 * @returns A fully initialized {@link EnvpushDatabase} with auto-migration applied.
 *
 * @example
 * ```typescript
 * // Zero config — just works
 * const db = await envpushDb();
 *
 * // Custom path
 * const db = await envpushDb({ connectionString: "./my-data/db" });
 * ```
 */
export async function envpushDb(config?: EnvpushDbConfig): Promise<EnvpushDatabase> {
  const connectionString = config?.connectionString ?? DEFAULT_CONNECTION_STRING;
  const client = new PGlite(connectionString); // auto-creates if not exists
  const db = drizzle(client, { schema });

  // Auto-run migrations on startup
  await migrate(db);

  return {
    users: userQueries(db),
    teams: teamQueries(db),
    teamMembers: teamMemberQueries(db),
    projects: projectQueries(db),
    environments: environmentQueries(db),
    secrets: secretQueries(db),
    auditLog: auditLogQueries(db),
    cliTokens: cliTokenQueries(db),
  };
}
```

```
packages/db-pglite/
├── src/
│   ├── index.ts          # envpushDb() entry point
│   ├── schema.ts         # Drizzle pg-core table definitions
│   ├── migrate.ts        # Auto-migration logic
│   └── queries/
│       ├── users.ts
│       ├── teams.ts
│       ├── projects.ts
│       ├── environments.ts
│       ├── secrets.ts
│       ├── audit.ts
│       └── cli-tokens.ts
├── drizzle.config.ts
└── package.json
```

### Usage in Server

```typescript
// apps/server/src/index.ts
import { envpushDb } from "@envpush/db-pglite";

const db = await envpushDb(); // just works — data stored in ./data/envpush/
// db.users.findByEmail("long@example.com")
// db.secrets.upsertMany(envId, items, userId)
```

### Community Drivers

To add PostgreSQL support, community creates `@envpush/db-postgres`:

```typescript
// Same interface, same config shape, different driver
import { envpushDb } from "@envpush/db-postgres";
const db = await envpushDb({ connectionString: "postgresql://user:pass@localhost:5432/envpush" });
// Implements EnvpushDatabase — server code doesn't change
```

## Server API Routes (Hono)

**Important:** All routes must be defined using Hono's chainable pattern so that `typeof app` captures the full route types for Hono RPC. Each route group should be a chained `.route()` call. **All route handlers must be documented with TSDoc comments** describing the endpoint, parameters, request body, response, and possible errors.

### Hono RPC Setup

```typescript
// server/index.ts
const app = new Hono()
  .route("/auth", authRoutes)
  .route("/teams", teamRoutes)
  .route("/projects", projectRoutes)
  .route("/environments", envRoutes);

export type AppType = typeof app;  // CLI imports this for typed client
```

```typescript
// CLI side — fully typed, no manual API client
import { hc } from "hono/client";
import type { AppType } from "@envpush/server";

const client = hc<AppType>("https://envpush.myserver.com", {
  headers: { Authorization: `Bearer ${token}` },
});

const res = await client.auth.login.$post({ json: { email, password } });
const secrets = await client.environments[":id"].secrets.$get({ param: { id: envId } });
```

### Route TSDoc Convention

```typescript
// server/routes/auth.ts
import { Hono } from "hono";

const auth = new Hono()
  /**
   * Register a new user account.
   *
   * @remarks First registered user automatically becomes the owner.
   * @param name - Display name
   * @param email - Unique email address
   * @param password - Min 8 characters
   * @returns The created user and JWT token
   * @throws 409 - Email already exists
   */
  .post("/register", ...)

  /**
   * Authenticate and receive a JWT token.
   *
   * @param email - Registered email
   * @param password - Account password
   * @returns JWT token and user info
   * @throws 401 - Invalid credentials
   */
  .post("/login", ...)

  /**
   * Get the currently authenticated user's info.
   *
   * @returns Current user with team memberships
   * @throws 401 - Not authenticated
   */
  .get("/me", ...);
```

### Auth
- `POST /auth/register` — Create account
- `POST /auth/login` — Login, return JWT
- `GET /auth/me` — Get current user info

### Teams
- `POST /teams` — Create team (generates invite code)
- `GET /teams/:id` — Get team details
- `POST /teams/join` — Join team by invite code
- `POST /teams/:id/regenerate-invite` — Regenerate invite code
- `GET /teams/:id/members` — List members
- `PATCH /teams/:id/members/:userId` — Update member role
- `DELETE /teams/:id/members/:userId` — Remove member
- `GET /teams/mine` — List teams current user belongs to

### Projects
- `POST /teams/:teamId/projects` — Create project
- `GET /teams/:teamId/projects` — List projects
- `GET /projects/:slug` — Get project
- `DELETE /projects/:id` — Delete project

### Environments
- `POST /projects/:id/environments` — Create environment
- `GET /projects/:id/environments` — List environments
- `DELETE /environments/:id` — Delete environment

### Secrets
- `GET /environments/:id/secrets` — List secrets (decrypted)
- `PUT /environments/:id/secrets` — Bulk upsert secrets (used by push)
- `DELETE /environments/:id/secrets/:key` — Delete a secret
- `GET /environments/:id/secrets/export` — Export as `.env` format

### Audit
- `GET /teams/:id/audit-log` — List audit events (paginated)

## CLI Architecture (Citty + @clack/prompts)

### Command Tree

```typescript
// commands/index.ts
import { defineCommand } from "citty";

export const main = defineCommand({
  meta: {
    name: "evp",
    version: "0.1.0",
    description: "🔐 Self-hosted environment variable manager",
  },
  subCommands: {
    // Auth
    register,    // Create account
    login,       // Login to server
    logout,      // Clear credentials
    whoami,      // Show current user & team

    // Teams
    team,        // team create | team join | team members | team invite-code

    // Project setup
    init,        // Smart project initialization
    link,        // Link to existing project/env

    // Secrets (git-like)
    pull,        // Pull remote → .env
    push,        // Push .env → remote (diff + confirm)
    set,         // Set single key
    unset,       // Remove single key
    list,        // List all secrets (formatted table)
    diff,        // Diff local vs remote

    // Environments
    env,         // env list | env switch | env create
  },
});
```

### Command Details & Flows

---

#### `evp register`
Create a new account on the server.

```
┌  🔐 evp register
│
◆  Server URL
│  https://evp.myserver.com
│
◆  Name
│  Long Nguyen
│
◆  Email
│  long@example.com
│
◆  Password
│  ••••••••
│
◆  Confirm password
│  ••••••••
│
◇  Creating account... ✓
│
◆  Create a team now?
│  ● Yes
│  ○ Skip for now
│
◆  Team name
│  acme-corp
│
◇  Team created ✓
│
├──────────────────────────────────┐
│  Invite code: ACME-X7K9-BETA    │
│  Share this with your teammates  │
├──────────────────────────────────┘
│
└  🎉 All set! Token saved to ~/.envpush/config.json
```

---

#### `evp login`
Login to existing account.

```
┌  🔐 evp login
│
◆  Server URL
│  https://evp.myserver.com
│
◆  Email
│  long@example.com
│
◆  Password
│  ••••••••
│
◇  Authenticating... ✓
│
└  🎉 Logged in! Token saved to ~/.envpush/config.json
```

---

#### `evp logout`
Clear stored credentials. No prompts needed.

```
✓ Logged out. Removed ~/.envpush/config.json
```

---

#### `evp whoami`
Show current user info.

```
User:    Long Nguyen (long@example.com)
Server:  https://evp.myserver.com
Teams:   acme-corp (owner), side-project (member)
```

---

#### `evp team create`
Create a new team.

```
┌  🔐 evp team create
│
◆  Team name
│  side-project
│
◇  Creating team... ✓
│
├──────────────────────────────────┐
│  Invite code: SIDE-R3K2-PROJ    │
│  Share this with your teammates  │
├──────────────────────────────────┘
│
└  Done!
```

---

#### `evp team join`
Join a team using invite code.

```
┌  🔐 evp team join
│
◆  Invite code
│  ACME-X7K9-BETA
│
◇  Joining team... ✓
│
└  🎉 Joined "acme-corp"!
```

Also supports non-interactive: `evp team join ACME-X7K9-BETA`

---

#### `evp team members`
List members of current/selected team.

```
Team: acme-corp

  NAME              EMAIL                  ROLE      JOINED
  Long Nguyen       long@example.com       owner     2 weeks ago
  Huy Luong         huy@example.com        admin     1 week ago
  Phuc Tran         phuc@example.com       member    3 days ago
```

---

#### `evp team invite-code`
Show or regenerate invite code.

```
┌  🔐 evp team invite-code
│
◆  Team: acme-corp
│  Current invite code: ACME-X7K9-BETA
│
◆  What do you want to do?
│  ○ Copy to clipboard
│  ● Regenerate new code
│
◇  Regenerating... ✓
│
├──────────────────────────────────┐
│  New invite code: ACME-P4Q8-NEW │
├──────────────────────────────────┘
│
└  Done! Old code is now invalid.
```

---

#### `evp init` ⭐ (Smart Project Initialization)
Automatically detects project info from the current directory.

**Smart detection reads from:**
- `package.json` → name, description
- `.git` → repo name, current branch
- Existing `.env` files → suggest importing
- Directory name as fallback
- Current branch → suggest environment mapping (main→production, develop→staging, *→development)

```
┌  🔐 evp init
│
◇  Detected project info:
│
├──────────────────────────────────────┐
│  Name:    web-app (from package.json) │
│  Branch:  develop                     │
│  .env:    found (14 variables)        │
├──────────────────────────────────────┘
│
◆  Select team
│  ● acme-corp
│  ○ side-project
│
◆  Project name
│  web-app (auto-filled, editable)
│
◆  Map current branch "develop" to environment:
│  ○ development
│  ● staging
│  ○ production
│  ○ custom...
│
◆  Found existing .env with 14 variables. Import them?
│  ● Yes, push to staging
│  ○ No, start fresh
│
◇  Creating project... ✓
◇  Creating environments (development, staging, production)... ✓
◇  Pushing 14 secrets to staging... ✓
◇  Created .evp.json ✓
│
├────────────────────────────────────┐
│  Project: web-app                  │
│  Environment: staging              │
│  Secrets: 14 synced                │
├────────────────────────────────────┘
│
└  Done! Use `evp pull` and `evp push` to sync.
```

---

#### `evp link`
Link current directory to an existing project/environment (for teammates joining).

```
┌  🔐 evp link
│
◆  Select team
│  ● acme-corp
│
◆  Select project
│  ○ web-app
│  ● api-server
│
◆  Select environment
│  ● development
│  ○ staging
│  ○ production
│
◇  Created .evp.json ✓
│
└  Linked! Run `evp pull` to fetch secrets.
```

---

#### `evp pull`
Pull remote secrets to local `.env`.

```
◇  Pulling development secrets for web-app...

  ↓ 14 secrets → .env

✓ Done
```

With `--stdout` flag: prints to stdout instead of writing file.
With `--env <name>` flag: pull from specific environment.

---

#### `evp push`
Push local `.env` to remote. Always shows diff and confirms.

```
◇  Comparing local .env with remote (development)...

  + NEW_API_KEY=sk-xxx          (new)
  ~ DATABASE_URL                (changed)
  - OLD_UNUSED_VAR              (removed)
  = 11 unchanged

◆  Push these changes to development?
│  ● Yes
│  ○ No
│
◇  Pushing... ✓
│
└  ✓ 3 changes pushed
```

---

#### `evp set KEY=VALUE`
Set a single secret. Non-interactive by default.

```
$ evp set API_KEY=sk-12345
✓ Set API_KEY in development
```

---

#### `evp unset KEY`
Remove a single secret.

```
$ evp unset OLD_KEY
✓ Removed OLD_KEY from development
```

---

#### `evp list`
Formatted table of all secrets.

```
Environment: development (web-app)

  KEY              VALUE           UPDATED BY       UPDATED
  DATABASE_URL     ••••••••        Long Nguyen      2 hours ago
  API_KEY          ••••••••        Huy Luong        3 days ago
  REDIS_URL        ••••••••        Long Nguyen      1 week ago

  14 secrets total
```

With `--reveal` flag: shows actual values.

---

#### `evp diff`
Color-coded diff of local `.env` vs remote.

```
Comparing local .env ↔ remote (development)

  + NEW_KEY=value              (local only)
  - REMOVED_KEY=old            (remote only)
  ~ CHANGED_KEY                (value differs)
    11 unchanged

No action taken. Use `evp push` to sync.
```

---

#### `evp env list`
List environments for current project.

```
Project: web-app

  ● development    14 secrets    updated 2h ago
  ○ staging        14 secrets    updated 1d ago
  ○ production     12 secrets    updated 3d ago
```

---

#### `evp env switch`
Switch active environment in `.evp.json`.

```
┌  evp env switch
│
◆  Select environment
│  ○ development (current)
│  ● staging
│  ○ production
│
◇  Switched to staging ✓
│
└  Run `evp pull` to fetch staging secrets.
```

---

#### `evp env create`
Create a new custom environment.

```
┌  evp env create
│
◆  Environment name
│  preview
│
◆  Copy secrets from existing environment?
│  ● development (14 secrets)
│  ○ staging (14 secrets)
│  ○ production (12 secrets)
│  ○ Start empty
│
◇  Created "preview" with 14 secrets ✓
│
└  Done! Use `evp env switch` to activate.
```

---

### Local Config Files

**`~/.envpush/config.json`** (global, per-user):
```json
{
  "server_url": "https://evp.myserver.com",
  "token": "elk_xxxxxxxxxxxx"
}
```

**`.evp.json`** (per-project root, gitignored):
```json
{
  "team": "acme-corp",
  "project": "web-app",
  "environment": "development"
}
```

## Shared Package (`packages/shared`)

```typescript
// Types
export type User, Team, TeamMember, Project, Environment, Secret, AuditEvent, CLIToken

// Zod schemas (used by server validation and CLI input validation)
export const RegisterSchema, LoginSchema, CreateTeamSchema, JoinTeamSchema,
  CreateProjectSchema, UpsertSecretsSchema, etc.

/**
 * Encrypt a secret value using AES-256-GCM.
 * @param value - Plaintext secret value
 * @param key - Encryption key (from EVPUSH_MASTER_KEY)
 * @returns Base64-encoded ciphertext with IV prepended
 */
export function encrypt(value: string, key: string): string

/**
 * Decrypt a secret value.
 * @param cipher - Base64-encoded ciphertext (as returned by {@link encrypt})
 * @param key - Same encryption key used for encryption
 * @returns Plaintext secret value
 */
export function decrypt(cipher: string, key: string): string

/**
 * Hash a CLI token before storage (one-way, like GitHub PATs).
 * @param token - Raw CLI token string
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string

/**
 * Generate a memorable invite code for team joining.
 * @returns Formatted code like "ACME-X7K9-BETA"
 */
export function generateInviteCode(): string

// Constants
export const ENVIRONMENTS_DEFAULT = ['development', 'staging', 'production']
export const ROLES = ['owner', 'admin', 'member'] as const

/**
 * Create a typed Hono RPC client for the EnvPush API.
 * See "Hono RPC Setup" section for how types flow from server routes.
 *
 * @param serverUrl - EnvPush server URL (e.g., "https://evp.myserver.com")
 * @param token - Optional JWT token for authenticated requests
 * @returns Fully typed Hono RPC client
 */
export function createClient(serverUrl: string, token?: string) {
  return hc<AppType>(serverUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/**
 * Auto-detect project info from the current working directory.
 * Used by `evp init` for smart initialization.
 *
 * @param cwd - Directory to scan (typically process.cwd())
 * @returns Detected project metadata
 */
export function detectProjectInfo(cwd: string): Promise<{
  name?: string;          // from package.json or directory name
  branch?: string;        // from git
  hasEnvFile: boolean;    // .env exists
  envVarCount?: number;   // number of vars in .env
  suggestedEnv?: string;  // branch → environment mapping
}>
```

## Security Requirements

- All secret values encrypted at rest with AES-256-GCM
- Encryption key derived from `EVPUSH_MASTER_KEY` env var (server-side)
- CLI tokens are hashed before storage (like GitHub PATs)
- Rate limiting on auth endpoints (Hono middleware)
- RBAC: owners can do everything, admins can manage projects/secrets, members can read/push secrets
- Audit log for all write operations
- Invite codes are the only way to join a team (no email invites, keep it simple)
- CLI token has expiration and can be revoked
- `.evp.json` should be gitignored (suggest during init)
- `.env` should be gitignored (suggest during init)

## Docker Setup

Single container, no external database. PGLite runs in-process, data persisted in a volume. No config needed.

```yaml
# docker-compose.yml
services:
  envpush:
    build: ./apps/server
    ports:
      - "8787:8787"
    volumes:
      - envpush-data:/app/data
    environment:
      - EVPUSH_MASTER_KEY=generate-a-secure-key
      - JWT_SECRET=generate-another-key
      # No DATABASE_URL needed — PGLite auto-creates in ./data/envpush/

volumes:
  envpush-data:
```

## Development Scripts (turbo)

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "dev:server": "turbo dev --filter=@envpush/server",
    "dev:cli": "turbo dev --filter=@envpush/cli",
    "db:generate": "turbo db:generate --filter=@envpush/db-pglite",
    "db:push": "turbo db:push --filter=@envpush/db-pglite",
    "db:studio": "turbo db:studio --filter=@envpush/db-pglite"
  }
}
```

## Implementation Order

1. **@envpush/shared** — Abstract DB interface (`EnvpushDatabase`), types, Zod schemas, crypto utils, smart detection utils
2. **@envpush/db-pglite** — PGLite driver: schema, queries, auto-migration, `envpushDb()` entry point
3. **Server** — Hono routes, auth, middleware (RBAC, audit, rate limit)
4. **CLI core** — Citty command structure, config file management (~/.envpush, .evp.json)
5. **CLI auth** — register, login, logout, whoami
6. **CLI team** — team create, team join, team members, team invite-code
7. **CLI project** — init (smart detection), link, env list/switch/create
8. **CLI secrets** — pull, push (with diff + confirm), set, unset, list, diff
9. **Polish** — Error handling, offline detection, helpful error messages, .gitignore suggestions

## Notes

- `evp pull` / `evp push` are the core workflow — git-like, always show diff before push
- Server seeds default environments (dev/staging/prod) on project creation
- Smart `init` reads package.json, git branch, existing .env to pre-fill everything
- Invite codes use memorable format: `XXXX-XXXX-XXXX` (alphanumeric)
- All interactive flows use @clack/prompts, all command routing uses Citty
- Non-interactive flags available where it makes sense (e.g., `evp team join CODE`, `evp set K=V`)
- `.evp.json` and `.env` should both be in `.gitignore` — suggest adding during init
- Hono RPC provides typed client — no manual API client needed, types flow from server routes via `hc<AppType>()`
- Shared package exports a `createClient` helper wrapping `hc<AppType>()`
- All server route handlers must have TSDoc comments (`@param`, `@returns`, `@throws`, `@remarks`)
- All shared package exports should have TSDoc comments
- `EnvpushDbConfig` uses standard field names (`connectionString`, `debug`) — universal across all drivers
- PGLite runs embedded Postgres in-process — no external DB, auto-creates `./data/envpush/` on first run
- `@envpush/shared` defines `EnvpushDatabase` interface — community can create `@envpush/db-postgres`, `@envpush/db-mysql`, etc.
- `envpushDb()` from `@envpush/db-pglite` needs zero arguments — just works
- Keep server stateless — all state in PGLite, all config in env vars
- chalk for colored output in non-interactive commands (list, diff, whoami)