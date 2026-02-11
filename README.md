# EnvPush

[![npm version](https://img.shields.io/npm/v/envpush)](https://www.npmjs.com/package/envpush)
[![CI](https://github.com/71zone/envpush/actions/workflows/ci.yml/badge.svg)](https://github.com/71zone/envpush/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Self-hosted `.env` manager for small teams. Push and pull secrets from the terminal -- no dashboard needed.

- AES-256-GCM encryption at rest
- Single Docker container, embedded Postgres (PGLite)
- RBAC (owner / admin / member) + audit log
- One env var to configure

## Install

```bash
# CLI
npm install -g envpush

# Server
docker run -d -p 8787:8787 \
  -e EVPUSH_MASTER_KEY=$(openssl rand -hex 32) \
  -v envpush-data:/app/data \
  ghcr.io/71zone/envpush-server:latest
```

## Quick Start

```bash
evp server https://your-server.example.com
evp register        # create account + team
evp init            # detect project, push .env
evp push            # sync local -> remote
evp pull            # sync remote -> local
```

Run `evp` with no arguments for an interactive menu:

<p align="center">
  <img src=".github/demo.gif" alt="evp interactive menu" width="700">
</p>

## Commands

| Command | |
|---|---|
| `evp push` / `pull` | Sync `.env` with remote |
| `evp set KEY=VAL` / `unset KEY` | Manage individual secrets |
| `evp list` / `diff` | Inspect remote secrets |
| `evp env list` / `switch` / `create` | Manage environments |
| `evp init` / `link` | Set up projects |
| `evp team create` / `join` / `members` / `invite-code` | Team management |
| `evp login` / `register` / `whoami` / `logout` | Account |
| `evp server [url]` | Set or show server URL |

## Server Config

| Variable | Default | |
|---|---|---|
| `EVPUSH_MASTER_KEY` | *required* | Encryption key (32+ chars) |
| `PORT` | `8787` | Server port |
| `EVPUSH_DATA_DIR` | `./data/envpush` | PGLite data path (mount a volume here) |

## Security

Secrets encrypted with AES-256-GCM. Tokens are SHA-256 hashed (PAT-style, `evp_` prefix). Passwords bcrypt-hashed. Auth endpoints rate-limited. CLI config stored with `0600` permissions.

## Development

```bash
pnpm install && pnpm build   # build all
pnpm dev                      # watch all
pnpm dev:server               # watch server
pnpm dev:cli                  # watch CLI
pnpm db:studio                # Drizzle Studio
```

**Stack:** Hono + PGLite + Drizzle ORM / Citty + Clack / Hono RPC / Turborepo + pnpm

## License

[MIT](https://opensource.org/licenses/MIT) -- [GitHub](https://github.com/71zone/envpush) / [npm](https://www.npmjs.com/package/envpush) / [Docker](https://ghcr.io/71zone/envpush-server)
