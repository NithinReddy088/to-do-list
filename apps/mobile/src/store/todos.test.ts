import { useTodoStore, mergeServerChanges } from "@/store/todos";
import type { Todo } from "@/types/todo";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@/services/api/client", () => ({
  api: { post: jest.fn() },
}));

function todo(over: Partial<Todo> = {}): Todo {
  return {
    id: "t1", title: "Task", notes: null, dueAt: null, completed: false,
    completedAt: null, sortOrder: 0, deletedAt: null,
    updatedAt: new Date().toISOString(), ...over,
  };
}

describe("mergeServerChanges", () => {
  it("adds new server todos", () => {
    const merged = mergeServerChanges([], [todo({ id: "s1" })]);
    expect(merged.map((t) => t.id)).toContain("s1");
  });

  it("keeps the newer version on conflict", () => {
    const older = todo({ id: "t1", title: "Local", updatedAt: new Date(Date.now() - 1000).toISOString() });
    const newer = todo({ id: "t1", title: "Server", updatedAt: new Date().toISOString() });
    const merged = mergeServerChanges([older], [newer]);
    expect(merged.find((t) => t.id === "t1")?.title).toBe("Server");
  });

  it("drops soft-deleted todos from the visible list", () => {
    const merged = mergeServerChanges([todo({ id: "t1" })], [todo({ id: "t1", deletedAt: new Date().toISOString() })]);
    expect(merged.find((t) => t.id === "t1")).toBeUndefined();
  });
});

describe("todo store mutations", () => {
  beforeEach(() => useTodoStore.setState({ todos: [], lastSyncAt: null, pending: [] }));

  it("adds a todo locally", () => {
    useTodoStore.getState().addTodo({ title: "Buy milk", notes: null, dueAt: null });
    expect(useTodoStore.getState().todos).toHaveLength(1);
    expect(useTodoStore.getState().todos[0].title).toBe("Buy milk");
  });

  it("toggles completion", () => {
    useTodoStore.getState().addTodo({ title: "X", notes: null, dueAt: null });
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().toggleTodo(id);
    expect(useTodoStore.getState().todos[0].completed).toBe(true);
  });

  it("soft-deletes a todo (removes from visible list)", () => {
    useTodoStore.getState().addTodo({ title: "X", notes: null, dueAt: null });
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().deleteTodo(id);
    expect(useTodoStore.getState().todos.find((t) => t.id === id)).toBeUndefined();
  });
});
