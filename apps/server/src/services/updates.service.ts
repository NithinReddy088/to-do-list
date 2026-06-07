import { createSign, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ulid } from "ulid";
import { config } from "@/config/configs";
import { updateRepo } from "@/repos/update.repo";
import type { Prisma } from "@prisma/client";

export interface ExpoManifest {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: { key: string; contentType: string; url: string };
  assets: Array<{ key: string; contentType: string; url: string }>;
  metadata: Record<string, unknown>;
  extra: Record<string, unknown>;
}

// The shape of the upload posted to POST /api/updates: the parsed contents of
// expo's dist/metadata.json plus every file under dist/ base64-encoded.
export interface PublishExportInput {
  runtimeVersion: string;
  platform: "ios" | "android";
  channel: string;
  metadata: Record<string, unknown>;
  files: Record<string, string>;
}

// Fix 3 (perf): cache the private key at module-load time instead of reading
// from disk on every signManifest call.
let _cachedPrivateKey: string | null = null;
function getPrivateKey(): string {
  if (!_cachedPrivateKey) {
    // Prefer an inline PEM (e.g. a Fly.io secret); fall back to the key file.
    _cachedPrivateKey = config.codeSigningPrivateKey
      ? config.codeSigningPrivateKey
      : readFileSync(config.codeSigningPrivateKeyPath, "utf8");
  }
  return _cachedPrivateKey;
}

function signManifest(manifest: ExpoManifest): string {
  const signer = createSign("RSA-SHA256");
  signer.update(JSON.stringify(manifest));
  signer.end();
  return signer.sign(getPrivateKey()).toString("base64");
}

function contentTypeForExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "ttf") return "font/ttf";
  return "application/octet-stream";
}

export const updatesService = {
  // Receives an exported Expo bundle, writes the files to storage, builds and
  // signs the Expo manifest, and persists it as the latest update. Works from
  // any machine — the server (not the publisher) owns the files and asset URLs.
  async publishExport(input: PublishExportInput): Promise<{ updateId: string }> {
    const updateId = randomUUID();
    const storagePath = `${input.runtimeVersion}/${ulid()}`;

    const storageRoot = resolve(join(config.updatesStorageDir, storagePath));

    // Write every uploaded file, guarding against path traversal per file.
    for (const [relPath, b64] of Object.entries(input.files)) {
      const full = resolve(join(config.updatesStorageDir, storagePath, relPath));
      const rel = relative(storageRoot, full);
      if (rel.startsWith("..") || rel === "" || resolve(storageRoot, rel) !== full) {
        throw new Error(`Refusing to write file outside storage dir: ${relPath}`);
      }
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, Buffer.from(b64, "base64"));
    }

    // Read the per-platform file metadata Expo wrote into dist/metadata.json.
    const fileMetadata = (input.metadata as Record<string, unknown>)
      .fileMetadata as Record<string, { bundle: string; assets: Array<{ path: string; ext: string }> }>;
    const fileMeta = fileMetadata?.[input.platform];
    if (!fileMeta) {
      throw new Error(`metadata.fileMetadata.${input.platform} missing from export`);
    }

    const assetUrl = (p: string) =>
      `${config.publicBaseUrl}/api/assets?asset=${encodeURIComponent(
        `${storagePath}/${p}`,
      )}&runtimeVersion=${input.runtimeVersion}&platform=${input.platform}`;

    const manifest: ExpoManifest = {
      id: updateId,
      createdAt: new Date().toISOString(),
      runtimeVersion: input.runtimeVersion,
      launchAsset: {
        key: "bundle",
        contentType: "application/javascript",
        url: assetUrl(fileMeta.bundle),
      },
      assets: fileMeta.assets.map((a) => ({
        key: a.path,
        contentType: contentTypeForExt(a.ext),
        url: assetUrl(a.path),
      })),
      metadata: {},
      extra: {},
    };

    await updateRepo.create({
      updateId,
      runtimeVersion: input.runtimeVersion,
      platform: input.platform,
      channel: input.channel,
      storagePath,
      manifestJson: manifest as unknown as Prisma.InputJsonValue,
    });

    return { updateId };
  },

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
      manifestJson: input.manifest as unknown as Prisma.InputJsonValue,
    });
  },

  async getLatestManifest(filter: { platform: string; runtimeVersion: string; channel: string }) {
    const row = await updateRepo.latest(filter);
    if (!row) return null;
    const manifest = row.manifestJson as unknown as ExpoManifest;
    return { manifest, signature: signManifest(manifest) };
  },
};
