import { ulid } from "ulid";
import { prisma } from "@/adapters/database";
import type { Prisma } from "@prisma/client";

export const updateRepo = {
  create(input: {
    updateId: string;
    runtimeVersion: string;
    platform: string;
    channel: string;
    storagePath: string;
    manifestJson: Prisma.InputJsonValue;
    commitHash?: string | null;
  }) {
    return prisma.update.create({ data: { id: ulid(), ...input } });
  },
  latest(filter: { platform: string; runtimeVersion: string; channel: string }) {
    return prisma.update.findFirst({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
  },
};
