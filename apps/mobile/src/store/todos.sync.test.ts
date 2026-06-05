/**
 * Regression test: sync() must not drop concurrent mutations
 *
 * Scenario:
 *   1. addTodo(A) — goes into pending
 *   2. sync() starts — snapshots pending=[A], fires POST (in-flight)
 *   3. addTodo(B) — arrives WHILE post is in-flight → pending=[A, B]
 *   4. POST resolves successfully
 *   5. A should be cleared (it was sent); B must stay in pending (not dropped)
 */

import { useTodoStore } from "@/store/todos";
import { api } from "@/services/api/client";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/services/api/client", () => ({
  api: { post: jest.fn() },
}));

const mockPost = api.post as jest.MockedFunction<typeof api.post>;

describe("sync race condition", () => {
  beforeEach(() => {
    useTodoStore.setState({ todos: [], lastSyncAt: null, pending: [] });
    jest.clearAllMocks();
  });

  it("keeps mutations that arrived during the in-flight POST (does not drop them)", async () => {
    // Step 1: add todo A
    useTodoStore.getState().addTodo({ title: "A", notes: null, dueAt: null });
    expect(useTodoStore.getState().pending).toHaveLength(1);

    // Step 2: set up a manually-controlled promise so we can interleave addTodo(B)
    let resolvePost!: (value: unknown) => void;
    mockPost.mockReturnValueOnce(
      new Promise((r) => {
        resolvePost = r;
      }) as ReturnType<typeof api.post>,
    );

    // Start sync but do NOT await yet — it is now in-flight
    const syncPromise = useTodoStore.getState().sync();

    // Step 3: while POST is in-flight, add todo B
    useTodoStore.getState().addTodo({ title: "B", notes: null, dueAt: null });
    expect(useTodoStore.getState().pending).toHaveLength(2);

    // Step 4: resolve the POST
    resolvePost({ data: { serverTime: new Date().toISOString(), changes: [] } });
    await syncPromise;

    // Step 5: assertions
    const { pending } = useTodoStore.getState();

    // B must still be pending (it arrived after the snapshot — was never sent)
    const titles = pending.map((p) => p.title);
    expect(titles).toContain("B"); // B was NOT sent → must remain

    // A must be gone (it was sent successfully)
    expect(titles).not.toContain("A"); // A was sent → must be cleared
  });
});
