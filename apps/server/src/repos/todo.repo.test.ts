import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/adapters/database";
import { userRepo } from "@/repos/user.repo";
import { todoRepo } from "@/repos/todo.repo";

let userId: string;
beforeEach(async () => {
  await prisma.todo.deleteMany();
  await prisma.user.deleteMany();
  userId = (await userRepo.create({ email: "a@b.com", passwordHash: "h" })).id;
});

describe("todoRepo", () => {
  it("upserts a todo and lists changes since a timestamp", async () => {
    const before = new Date(Date.now() - 1000);
    await todoRepo.upsert(userId, {
      id: "t1", title: "Buy milk", completed: false, sortOrder: 0,
      notes: null, dueAt: null, completedAt: null, deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
    const changes = await todoRepo.changedSince(userId, before);
    expect(changes.map((c) => c.id)).toContain("t1");
  });

  it("scopes todos to their owner", async () => {
    const other = (await userRepo.create({ email: "c@d.com", passwordHash: "h" })).id;
    await todoRepo.upsert(userId, {
      id: "t1", title: "Mine", completed: false, sortOrder: 0,
      notes: null, dueAt: null, completedAt: null, deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
    const otherChanges = await todoRepo.changedSince(other, new Date(0));
    expect(otherChanges).toHaveLength(0);
  });
});
