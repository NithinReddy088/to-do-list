import { checkAndApplyUpdate } from "@/features/updates/useUpdates";

const mockUpdates = {
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
};
jest.mock("expo-updates", () => mockUpdates);

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
