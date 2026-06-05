import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/adapters/database";
import { userRepo } from "@/repos/user.repo";

describe("userRepo", () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates and finds a user by email", async () => {
    const created = await userRepo.create({ email: "a@b.com", passwordHash: "h" });
    expect(created.id).toBeTruthy();
    const found = await userRepo.findByEmail("a@b.com");
    expect(found?.id).toBe(created.id);
  });

  it("returns null for unknown email", async () => {
    expect(await userRepo.findByEmail("nope@b.com")).toBeNull();
  });
});
