import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "@/config/configs";
import { authGuard } from "@/common/middleware/auth";
import { todoService } from "@/services/todo.service";

const todoChange = t.Object({
  id: t.String(),
  title: t.String(),
  notes: t.Union([t.String(), t.Null()]),
  dueAt: t.Union([t.String(), t.Null()]),
  completed: t.Boolean(),
  completedAt: t.Union([t.String(), t.Null()]),
  sortOrder: t.Number(),
  deletedAt: t.Union([t.String(), t.Null()]),
  updatedAt: t.String(),
});

export const todoRoutes = new Elysia({ prefix: "/todos" })
  .use(jwt({ name: "jwt", secret: config.jwtSecret }))
  .use(authGuard)
  .post(
    "/sync",
    ({ userId, body }) => todoService.sync(userId, body),
    { body: t.Object({ lastSyncAt: t.Union([t.String(), t.Null()]), changes: t.Array(todoChange) }) },
  );
