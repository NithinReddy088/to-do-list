import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTodoStore } from "@/store/todos";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@/services/api/client", () => ({ api: { post: jest.fn() } }));

describe("todo persistence", () => {
  it("writes todos to AsyncStorage after a mutation", async () => {
    useTodoStore.setState({ todos: [], lastSyncAt: null, pending: [] });
    useTodoStore.getState().addTodo({ title: "Persist me", notes: null, dueAt: null });
    // Allow zustand persist middleware to flush.
    await new Promise((r) => setTimeout(r, 0));
    const raw = await AsyncStorage.getItem("todo-store");
    expect(raw).toContain("Persist me");
  });
});
