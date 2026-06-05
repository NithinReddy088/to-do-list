import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/adapters/database";
import { authService } from "@/services/auth.service";

describe("authService", () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany();
    await prisma.user.deleteMany();
  });

  it("registers a user with a hashed password", async () => {
    const user = await authService.register("a@b.com", "secret123");
    expect(user.email).toBe("a@b.com");
    const row = await prisma.user.findUnique({ where: { email: "a@b.com" } });
    expect(row?.passwordHash).not.toBe("secret123");
  });

  it("rejects duplicate email", async () => {
    await authService.register("a@b.com", "secret123");
    await expect(authService.register("a@b.com", "secret123")).rejects.toThrow("EMAIL_TAKEN");
  });

  it("verifies correct credentials and rejects wrong ones", async () => {
    await authService.register("a@b.com", "secret123");
    const ok = await authService.verify("a@b.com", "secret123");
    expect(ok?.email).toBe("a@b.com");
    expect(await authService.verify("a@b.com", "wrong")).toBeNull();
  });
});
