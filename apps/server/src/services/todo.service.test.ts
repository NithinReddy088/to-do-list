import { describe, it, expect, beforeEach } from "bun:test";
import { ulid } from "ulid";
import { prisma } from "@/adapters/database";
import { userRepo } from "@/repos/user.repo";
import { todoService } from "@/services/todo.service";

let userId: string;
beforeEach(async () => {
  await prisma.todo.deleteMany();
  await prisma.user.deleteMany();
  userId = (await userRepo.create({ email: "a@b.com", passwordHash: "h" })).id;
});

function change(over: Partial<any> = {}) {
  return {
    id: "t1", title: "Task", notes: null, dueAt: null, completed: false,
    completedAt: null, sortOrder: 0, deletedAt: null,
    updatedAt: new Date().toISOString(), ...over,
  };
}

describe("todoService.sync", () => {
  it("applies a client create and returns it in server changes", async () => {
    const res = await todoService.sync(userId, { lastSyncAt: null, changes: [change()] });
    expect(res.changes.find((c) => c.id === "t1")?.title).toBe("Task");
  });

  it("keeps the newer write (last-write-wins)", async () => {
    const old = new Date(Date.now() - 10000).toISOString();
    const now = new Date().toISOString();
    await todoService.sync(userId, { lastSyncAt: null, changes: [change({ title: "New", updatedAt: now })] });
    await todoService.sync(userId, { lastSyncAt: null, changes: [change({ title: "Stale", updatedAt: old })] });
    const row = await prisma.todo.findUnique({ where: { id: "t1" } });
    expect(row?.title).toBe("New");
  });

  it("returns only changes newer than lastSyncAt", async () => {
    const first = await todoService.sync(userId, { lastSyncAt: null, changes: [change()] });
    const second = await todoService.sync(userId, {
      lastSyncAt: first.serverTime,
      changes: [],
    });
    expect(second.changes).toHaveLength(0);
  });

  it("cross-tenant write: user A cannot clobber or take over user B's todo", async () => {
    // Set up two users
    const userA = await userRepo.create({ email: "a@example.com", passwordHash: "ha" });
    const userB = await userRepo.create({ email: "b@example.com", passwordHash: "hb" });

    const todoId = ulid();
    const originalTitle = "B's secret todo";

    // Seed a todo owned by B (via B's legitimate sync)
    await todoService.sync(userB.id, {
      lastSyncAt: null,
      changes: [
        {
          id: todoId,
          title: originalTitle,
          notes: null,
          dueAt: null,
          completed: false,
          completedAt: null,
          sortOrder: 0,
          deletedAt: null,
          updatedAt: new Date(Date.now() - 5000).toISOString(),
        },
      ],
    });

    // Confirm B owns it
    const beforeAttack = await prisma.todo.findUnique({ where: { id: todoId } });
    expect(beforeAttack?.userId).toBe(userB.id);
    expect(beforeAttack?.title).toBe(originalTitle);

    // A tries to overwrite B's todo with a future timestamp (bypass LWW)
    await todoService.sync(userA.id, {
      lastSyncAt: null,
      changes: [
        {
          id: todoId,
          title: "HACKED by A",
          notes: null,
          dueAt: null,
          completed: false,
          completedAt: null,
          sortOrder: 0,
          deletedAt: null,
          updatedAt: new Date(Date.now() + 99999999).toISOString(), // future timestamp
        },
      ],
    });

    // Row must still belong to B and have B's original title
    const afterAttack = await prisma.todo.findUnique({ where: { id: todoId } });
    expect(afterAttack?.userId).toBe(userB.id);
    expect(afterAttack?.title).toBe(originalTitle);

    // Sanity: B's own legitimate LWW update still works
    await todoService.sync(userB.id, {
      lastSyncAt: null,
      changes: [
        {
          id: todoId,
          title: "B updated legitimately",
          notes: null,
          dueAt: null,
          completed: false,
          completedAt: null,
          sortOrder: 0,
          deletedAt: null,
          updatedAt: new Date(Date.now() + 1000).toISOString(),
        },
      ],
    });
    const afterBUpdate = await prisma.todo.findUnique({ where: { id: todoId } });
    expect(afterBUpdate?.userId).toBe(userB.id);
    expect(afterBUpdate?.title).toBe("B updated legitimately");
  });
});
