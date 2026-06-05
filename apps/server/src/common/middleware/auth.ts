import { Elysia } from "elysia";

// Derives `userId` from the Bearer JWT. Apply AFTER a `.use(jwt({ name: "jwt", ... }))`.
// Uses `as: "scoped"` so the derive and beforeHandle apply only to routes mounted after
// this plugin — not to sibling routes on the parent app.
export const authGuard = new Elysia({ name: "auth-guard" })
  .derive({ as: "scoped" }, async ({ headers, jwt }) => {
    const header = headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return { userId: "" };
    const payload = await jwt.verify(token);
    if (!payload || typeof payload.sub !== "string") return { userId: "" };
    return { userId: payload.sub };
  })
  .onBeforeHandle({ as: "scoped" }, ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: { code: "UNAUTHORIZED", message: "Unauthorized" } };
    }
  });
