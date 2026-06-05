export interface Todo {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
  deletedAt: string | null;
  updatedAt: string;
}

export type TodoFilter = "all" | "active" | "done";
