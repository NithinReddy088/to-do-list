import { useState } from "react";
import * as Updates from "expo-updates";

// Imperative helper (also unit-tested): checks our self-hosted server for a new
// JS bundle, downloads it, and reloads if requested. Returns whether an update
// was applied.
export async function checkAndApplyUpdate(opts: { reload: boolean }): Promise<boolean> {
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return false;
  await Updates.fetchUpdateAsync();
  if (opts.reload) await Updates.reloadAsync();
  return true;
}

export function useUpdates() {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function check() {
    setChecking(true);
    setStatus(null);
    try {
      const applied = await checkAndApplyUpdate({ reload: false });
      setStatus(applied ? "Update downloaded. Restart to apply." : "You're up to date.");
    } catch {
      setStatus("Update check failed.");
    } finally {
      setChecking(false);
    }
  }

  return {
    checking,
    status,
    check,
    currentUpdateId: Updates.updateId,
    runtimeVersion: Updates.runtimeVersion,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
