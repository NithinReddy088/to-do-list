// Prisma 7 config. Use plain process.env with a local fallback (matches the iac
// backend pattern) instead of Prisma's strict env() helper, which throws at
// config-load time when DATABASE_URL is unset — that broke bare `prisma generate`.
// The fallback IS the local dev URL (Postgres on host port 5433 to avoid the
// already-running instance on 5432). The db:* scripts still pass --env-file so
// non-local envs override it.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://todo:todo@localhost:5433/todo?schema=public",
  },
});
