import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { config } from "@/config/configs";
import { updateRepo } from "@/repos/update.repo";

export interface ExpoManifest {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: { key: string; contentType: string; url: string };
  assets: Array<{ key: string; contentType: string; url: string }>;
  metadata: Record<string, unknown>;
  extra: Record<string, unknown>;
}

function signManifest(manifest: ExpoManifest): string {
  const privateKey = readFileSync(config.codeSigningPrivateKeyPath, "utf8");
  const signer = createSign("RSA-SHA256");
  signer.update(JSON.stringify(manifest));
  signer.end();
  return signer.sign(privateKey).toString("base64");
}

export const updatesService = {
  async recordUpdate(input: {
    updateId: string;
    runtimeVersion: string;
    platform: string;
    channel: string;
    storagePath: string;
    manifest: ExpoManifest;
  }) {
    return updateRepo.create({
      updateId: input.updateId,
      runtimeVersion: input.runtimeVersion,
      platform: input.platform,
      channel: input.channel,
      storagePath: input.storagePath,
      manifestJson: input.manifest as unknown as Record<string, unknown>,
    });
  },

  async getLatestManifest(filter: { platform: string; runtimeVersion: string; channel: string }) {
    const row = await updateRepo.latest(filter);
    if (!row) return null;
    const manifest = row.manifestJson as unknown as ExpoManifest;
    return { manifest, signature: signManifest(manifest) };
  },
};
