import { describe, it, expect, beforeEach } from "bun:test";
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
});
