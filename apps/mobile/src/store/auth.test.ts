import { useAuthStore } from "@/store/auth";

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
});
