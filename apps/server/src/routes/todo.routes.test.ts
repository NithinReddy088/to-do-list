import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/adapters/database";
import app from "@/app";

async function json(path: string, method: string, body: unknown, token?: string) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

async function registerAndToken() {
  const res = await json("/auth/register", "POST", { email: "a@b.com", password: "secret123" });
  return ((await res.json()) as { token: string }).token;
}

describe("todo routes", () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany();
    await prisma.user.deleteMany();
  });

  it("rejects sync without a token", async () => {
    const res = await json("/todos/sync", "POST", { lastSyncAt: null, changes: [] });
    expect(res.status).toBe(401);
  });

  it("syncs a todo for the authenticated user", async () => {
    const token = await registerAndToken();
    const res = await json(
      "/todos/sync",
      "POST",
      {
        lastSyncAt: null,
        changes: [{
          id: "t1", title: "Buy milk", notes: null, dueAt: null, completed: false,
          completedAt: null, sortOrder: 0, deletedAt: null, updatedAt: new Date().toISOString(),
        }],
      },
      token,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { changes: Array<{ id: string; title: string }> };
    expect(data.changes.find((c) => c.id === "t1")?.title).toBe("Buy milk");
  });
});
