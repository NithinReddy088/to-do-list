import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/adapters/database";
import app from "@/app";

async function post(path: string, body: unknown, token?: string) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("auth routes", () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany();
    await prisma.user.deleteMany();
  });

  it("registers then returns a token", async () => {
    const res = await post("/auth/register", { email: "a@b.com", password: "secret123" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBeTruthy();
    expect(json.user.email).toBe("a@b.com");
  });

  it("logs in with correct credentials", async () => {
    await post("/auth/register", { email: "a@b.com", password: "secret123" });
    const res = await post("/auth/login", { email: "a@b.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect((await res.json()).token).toBeTruthy();
  });

  it("rejects bad login with 401", async () => {
    await post("/auth/register", { email: "a@b.com", password: "secret123" });
    const res = await post("/auth/login", { email: "a@b.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});
