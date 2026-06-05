import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ulid } from "ulid"; // available transitively; if not, `bun add ulid`
import { api } from "@/services/api/client";
import type { Todo } from "@/types/todo";

// Pure merge used by the sync engine and unit-tested directly. Last-write-wins
// by `updatedAt`; soft-deleted rows are removed from the visible list but their
// deletion is what propagated, so we simply drop them here.
export function mergeServerChanges(local: Todo[], server: Todo[]): Todo[] {
  const byId = new Map(local.map((t) => [t.id, t]));
  for (const s of server) {
    const existing = byId.get(s.id);
    if (!existing || new Date(s.updatedAt) >= new Date(existing.updatedAt)) {
      byId.set(s.id, s);
    }
  }
  return [...byId.values()].filter((t) => !t.deletedAt);
}

interface TodoState {
  todos: Todo[];
  lastSyncAt: string | null;
  pending: Todo[]; // local changes awaiting push
  addTodo: (input: { title: string; notes: string | null; dueAt: string | null }) => void;
  updateTodo: (id: string, patch: Partial<Pick<Todo, "title" | "notes" | "dueAt">>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  sync: () => Promise<void>;
}

function stamp(t: Todo): Todo {
  return { ...t, updatedAt: new Date().toISOString() };
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      lastSyncAt: null,
      pending: [],

      addTodo: (input) => {
        const now = new Date().toISOString();
        const todo: Todo = {
          id: ulid(),
          title: input.title,
          notes: input.notes,
          dueAt: input.dueAt,
          completed: false,
          completedAt: null,
          sortOrder: get().todos.length,
          deletedAt: null,
          updatedAt: now,
        };
        set((s) => ({ todos: [...s.todos, todo], pending: [...s.pending, todo] }));
      },

      updateTodo: (id, patch) =>
        set((s) => {
          const next = s.todos.map((t) => (t.id === id ? stamp({ ...t, ...patch }) : t));
          const changed = next.find((t) => t.id === id)!;
          return { todos: next, pending: [...s.pending, changed] };
        }),

      toggleTodo: (id) =>
        set((s) => {
          const next = s.todos.map((t) =>
            t.id === id
              ? stamp({ ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null })
              : t,
          );
          const changed = next.find((t) => t.id === id)!;
          return { todos: next, pending: [...s.pending, changed] };
        }),

      deleteTodo: (id) =>
        set((s) => {
          const deleted = s.todos
            .filter((t) => t.id === id)
            .map((t) => stamp({ ...t, deletedAt: new Date().toISOString() }));
          return { todos: s.todos.filter((t) => t.id !== id), pending: [...s.pending, ...deleted] };
        }),

      sync: async () => {
        const { lastSyncAt, pending, todos } = get();
        try {
          const { data } = await api.post("/todos/sync", { lastSyncAt, changes: pending });
          set({
            todos: mergeServerChanges(todos, data.changes as Todo[]),
            lastSyncAt: data.serverTime,
            pending: [],
          });
        } catch {
          // Offline or server error: keep pending changes for the next attempt.
        }
      },
    }),
    {
      name: "todo-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ todos: s.todos, lastSyncAt: s.lastSyncAt, pending: s.pending }),
    },
  ),
);
