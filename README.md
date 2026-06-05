# To-Do List App

iOS-first Expo to-do app with self-hosted OTA updates and a Bun backend.

- `apps/server` — Bun + Elysia + Prisma + Postgres: auth, todo sync, OTA updates server.
- `apps/mobile` — Expo SDK 54 app: offline-first todos, expo-updates pointed at our server.

See `docs/superpowers/specs/2026-06-05-todo-app-design.md` for the design and
`docs/superpowers/plans/2026-06-05-todo-app.md` for the build plan.

## Quick start

**Server** (Postgres runs on host port 5433 to avoid colliding with a default local Postgres on 5432):
```sh
cd apps/server && bun install && cp env/.env.local.example env/.env.local && docker compose up -d && bun run db:migrate && bun run dev
```

**Mobile:**
```sh
cd apps/mobile && bun install && cp .env.local.example .env.local && bun run dev
```

## Testing

- **Backend:** `cd apps/server && bun run test` — use `bun run test` (not bare `bun test`); the `run` script loads `env/.env.local`, without which DB-backed tests fail on a missing `DATABASE_URL`.
- **Mobile:** `cd apps/mobile && bun run test`
