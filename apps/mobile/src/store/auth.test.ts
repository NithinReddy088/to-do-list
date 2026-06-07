import { useAuthStore } from "@/store/auth";
import { useTodoStore } from "@/store/todos";
import type { Todo } from "@/types/todo";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("@/services/api/client", () => ({
  api: { post: jest.fn(), defaults: { headers: { common: {} } } },
  setAuthToken: jest.fn(),
}));

describe("auth store", () => {
  beforeEach(() => useAuthStore.setState({ token: null, user: null }));

  it("stores token and user on successful login", async () => {
    const { api } = require("@/services/api/client");
    api.post.mockResolvedValueOnce({ data: { token: "jwt", user: { id: "u1", email: "a@b.com" } } });
    await useAuthStore.getState().login("a@b.com", "secret123");
    expect(useAuthStore.getState().token).toBe("jwt");
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
  });

  it("clears state on logout", async () => {
    useAuthStore.setState({ token: "jwt", user: { id: "u1", email: "a@b.com" } });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("clears a previous account's cached todos on login (data isolation)", async () => {
    const stale: Todo = {
      id: "old", title: "A's task", notes: null, dueAt: null, completed: false,
      completedAt: null, sortOrder: 0, deletedAt: null, updatedAt: new Date().toISOString(),
    };
    useTodoStore.setState({ todos: [stale], pending: [stale], lastSyncAt: "2020-01-01T00:00:00.000Z" });

    const { api } = require("@/services/api/client");
    api.post.mockResolvedValueOnce({ data: { token: "jwt2", user: { id: "u2", email: "b@b.com" } } });
    await useAuthStore.getState().login("b@b.com", "secret123");

    expect(useTodoStore.getState().todos).toHaveLength(0);
    expect(useTodoStore.getState().pending).toHaveLength(0);
    expect(useTodoStore.getState().lastSyncAt).toBeNull();
  });

  it("clears cached todos on logout", async () => {
    const stale: Todo = {
      id: "old", title: "A's task", notes: null, dueAt: null, completed: false,
      completedAt: null, sortOrder: 0, deletedAt: null, updatedAt: new Date().toISOString(),
    };
    useTodoStore.setState({ todos: [stale], pending: [], lastSyncAt: "x" });
    await useAuthStore.getState().logout();
    expect(useTodoStore.getState().todos).toHaveLength(0);
  });
});
