import { prisma } from "@/adapters/database";

export interface TodoInput {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
  deletedAt: string | null;
  updatedAt: string; // ISO; drives last-write-wins
}

function toData(userId: string, t: TodoInput) {
  return {
    userId,
    title: t.title,
    notes: t.notes,
    dueAt: t.dueAt ? new Date(t.dueAt) : null,
    completed: t.completed,
    completedAt: t.completedAt ? new Date(t.completedAt) : null,
    sortOrder: t.sortOrder,
    deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    updatedAt: new Date(t.updatedAt),
  };
}

export const todoRepo = {
  findById(id: string) {
    return prisma.todo.findUnique({ where: { id } });
  },
  upsert(userId: string, t: TodoInput) {
    const { userId: _userId, ...updateData } = toData(userId, t);
    return prisma.todo.upsert({
      where: { id: t.id },
      create: { id: t.id, ...toData(userId, t) },
      update: updateData,
    });
  },
  changedSince(userId: string, since: Date) {
    return prisma.todo.findMany({
      where: { userId, updatedAt: { gt: since } },
      orderBy: { updatedAt: "asc" },
    });
  },
};
