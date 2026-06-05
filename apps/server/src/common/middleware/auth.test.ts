import { describe, it, expect } from "bun:test";
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "@/config/configs";
import { authGuard } from "@/common/middleware/auth";

const probe = new Elysia()
  .use(jwt({ name: "jwt", secret: config.jwtSecret }))
  .use(authGuard)
  .get("/whoami", ({ userId }) => ({ userId }));

it("rejects missing token with 401", async () => {
  const res = await probe.handle(new Request("http://localhost/whoami"));
  expect(res.status).toBe(401);
});

it("passes userId through with a valid token", async () => {
  const signer = new Elysia().use(jwt({ name: "jwt", secret: config.jwtSecret }));
  const token = await (signer as any).decorator.jwt.sign({ sub: "user-123" });
  const res = await probe.handle(
    new Request("http://localhost/whoami", { headers: { authorization: `Bearer ${token}` } }),
  );
  expect(res.status).toBe(200);
  expect((await res.json()).userId).toBe("user-123");
});
