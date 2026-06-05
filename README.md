# To-Do List App

iOS-first Expo to-do app with self-hosted OTA updates and a Bun backend.

- `apps/server` — Bun + Elysia + Prisma + Postgres: auth, todo sync, OTA updates server.
- `apps/mobile` — Expo SDK 54 app: offline-first todos, expo-updates pointed at our server.

See `docs/superpowers/specs/2026-06-05-todo-app-design.md` for the design and
`docs/superpowers/plans/2026-06-05-todo-app.md` for the build plan.

## Quick start
1. `cd apps/server && bun install && docker compose up -d && bun run db:migrate && bun run dev`
2. `cd apps/mobile && bun install && bun run dev`
