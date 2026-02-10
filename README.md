# EnvPush

[![npm version](https://img.shields.io/npm/v/envpush)](https://www.npmjs.com/package/envpush)
[![CI](https://github.com/71zone/envpush/actions/workflows/ci.yml/badge.svg)](https://github.com/71zone/envpush/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A CLI-first, self-hosted environment variable manager for small teams.
Push and pull `.env` files securely -- no web dashboard, everything happens in the terminal.

---

## Overview

EnvPush lets teams share environment variables across projects and environments with a single command. Secrets are encrypted at rest with AES-256-GCM, and the server runs as a single Docker container with an embedded Postgres database (PGLite). No external dependencies, no managed services -- just one env var to configure.

**Key features:**

- `evp push` / `evp pull` to sync `.env` files with your team
- AES-256-GCM encryption at rest
- RBAC with owner, admin, and member roles
- Audit logging for all changes
- Zero-config embedded database (PGLite -- in-process Postgres)
- Single container deployment

## Installation

### CLI

```bash
npm install -g envpush
```

The binary name is `evp`.

### Server (Docker)

```bash
docker run -d \
  -p 8787:8787 \
  -e EVPUSH_MASTER_KEY=your-secret-key-at-least-32-chars \
  -v envpush-data:/app/data \
  ghcr.io/71zone/envpush-server:latest
```

### From Source

```bash
git clone https://github.com/71zone/envpush.git
cd envpush
pnpm install
pnpm build
```

Run the server:

```bash
EVPUSH_MASTER_KEY=<key> node apps/server/dist/index.js
```

Run the CLI:

```bash
node apps/cli/dist/index.js <command>
```

## Quick Start

```bash
# 1. Point the CLI at your server
evp server http://localhost:8787

# 2. Create an account (optionally creates a team)
evp register

# 3. Initialize a project (detects name, branch, .env)
evp init

# 4. Push local .env to the server
evp push

# 5. On another machine, pull secrets down
evp pull
```

Run `evp` with no arguments for an interactive menu.

## CLI Commands

### Secrets

| Command | Description |
|---------|-------------|
| `evp pull` | Sync remote secrets to local `.env` |
| `evp push` | Sync local `.env` to remote (with diff preview) |
| `evp set KEY=VALUE` | Set a single secret remotely |
| `evp unset KEY` | Remove a secret remotely |
| `evp list` | Show all remote secret keys |
| `evp diff` | Compare local vs remote |

### Environments

| Command | Description |
|---------|-------------|
| `evp env list` | List all environments |
| `evp env switch` | Switch active environment |
| `evp env create` | Create a new environment |

### Projects

| Command | Description |
|---------|-------------|
| `evp init` | Initialize a new project (smart detection) |
| `evp link` | Link to an existing project |

### Teams

| Command | Description |
|---------|-------------|
| `evp team create` | Create a new team |
| `evp team join` | Join with an invite code |
| `evp team members` | List members and roles |
| `evp team invite-code` | Show or regenerate invite code |

### Account

| Command | Description |
|---------|-------------|
| `evp login` | Authenticate |
| `evp register` | Create an account |
| `evp whoami` | Show current user |
| `evp logout` | Clear credentials |
| `evp server [url]` | Set or show server URL |

## Self-Hosting

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EVPUSH_MASTER_KEY` | Yes | -- | Encryption key for secrets (32+ characters) |
| `PORT` | No | `8787` | Server port |
| `EVPUSH_DATA_DIR` | No | `./data/envpush` | PGLite data directory |

The server uses PGLite, an embedded Postgres that runs in-process. No external database to manage. Data is persisted to disk at `EVPUSH_DATA_DIR` -- mount a volume there for persistence in Docker.

### Generating a Master Key

```bash
openssl rand -base64 32
```

Use the output as your `EVPUSH_MASTER_KEY`. Keep it safe -- losing it means losing access to all encrypted secrets.

## Security

- **Encryption at rest** -- Secrets are encrypted with AES-256-GCM using the master key
- **Token hashing** -- PAT-style tokens (`evp_` prefix) are SHA-256 hashed before storage, similar to GitHub PATs
- **Password hashing** -- bcrypt for all stored passwords
- **Rate limiting** -- Auth endpoints are rate-limited (5 req/min/IP)
- **RBAC** -- Role-based access control enforced on all team operations
- **File permissions** -- CLI config stored with 0600 permissions
- **Audit trail** -- Full mutation history for all secrets

## Project Structure

```
envpush/
├── apps/
│   ├── server/          # Hono API server (Node.js)
│   └── cli/             # CLI application (Citty + Clack)
├── packages/
│   ├── shared/          # Types, Zod schemas, crypto, utilities
│   ├── db-pglite/       # PGLite + Drizzle ORM database layer
│   ├── client/          # Typed Hono RPC client
│   └── tsconfig/        # Shared TypeScript configs
├── turbo.json
└── pnpm-workspace.yaml
```

### Tech Stack

- **Server:** Hono + PGLite (embedded Postgres) + Drizzle ORM
- **CLI:** Citty + @clack/prompts + chalk
- **Client:** Hono RPC (fully typed end-to-end)
- **Monorepo:** Turborepo + pnpm workspaces
- **CI/CD:** GitHub Actions, Changesets, npm + Docker (ghcr.io)

## Development

```bash
pnpm dev            # Watch all packages
pnpm dev:server     # Watch server only
pnpm dev:cli        # Watch CLI only
pnpm db:studio      # Open Drizzle Studio
```

Build everything:

```bash
pnpm build
```

## License

[MIT](https://opensource.org/licenses/MIT)

## Links

- [GitHub](https://github.com/71zone/envpush)
- [npm](https://www.npmjs.com/package/envpush)
- [Docker Image](https://ghcr.io/71zone/envpush-server)
