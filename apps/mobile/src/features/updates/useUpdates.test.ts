import * as Updates from "expo-updates";
import { checkAndApplyUpdate } from "@/features/updates/useUpdates";

// Self-contained factory (no outer references) so it survives jest's hoisting
// above the imports. `__esModule: true` makes the production
// `import * as Updates from "expo-updates"` resolve to this object directly
// instead of nesting it under `.default`.
jest.mock("expo-updates", () => ({
  __esModule: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

// The imported namespace IS the mock; alias it with jest.Mock typing.
const mockUpdates = Updates as unknown as {
  checkForUpdateAsync: jest.Mock;
  fetchUpdateAsync: jest.Mock;
  reloadAsync: jest.Mock;
};

describe("checkAndApplyUpdate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does nothing when no update is available", async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValueOnce({ isAvailable: false });
    const applied = await checkAndApplyUpdate({ reload: false });
    expect(applied).toBe(false);
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it("fetches and (optionally) reloads when an update is available", async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValueOnce({ isAvailable: true });
    mockUpdates.fetchUpdateAsync.mockResolvedValueOnce({ isNew: true });
    const applied = await checkAndApplyUpdate({ reload: true });
    expect(applied).toBe(true);
    expect(mockUpdates.fetchUpdateAsync).toHaveBeenCalled();
    expect(mockUpdates.reloadAsync).toHaveBeenCalled();
  });
});
