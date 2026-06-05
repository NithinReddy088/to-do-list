import { todoRepo, type TodoInput } from "@/repos/todo.repo";

export interface SyncRequest {
  lastSyncAt: string | null;
  changes: TodoInput[];
}

export const todoService = {
  async sync(userId: string, req: SyncRequest) {
    // Apply each client change only if it is safe and newer than the stored row.
    for (const incoming of req.changes) {
      const existing = await todoRepo.findById(incoming.id);
      // If the row exists but belongs to another user, skip it silently.
      if (existing && existing.userId !== userId) {
        continue;
      }
      // No existing row (create) or caller owns it: apply last-write-wins.
      if (!existing || new Date(incoming.updatedAt) >= existing.updatedAt) {
        await todoRepo.upsert(userId, incoming);
      }
    }
    const since = req.lastSyncAt ? new Date(req.lastSyncAt) : new Date(0);
    const changes = await todoRepo.changedSince(userId, since);
    return { serverTime: new Date().toISOString(), changes };
  },
};
