import { ulid } from "ulid";
import { prisma } from "@/adapters/database";

export const userRepo = {
  create(input: { email: string; passwordHash: string }) {
    return prisma.user.create({
      data: { id: ulid(), email: input.email, passwordHash: input.passwordHash },
    });
  },
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
};
