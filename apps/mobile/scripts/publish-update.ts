import { $ } from "bun";
import { readFileSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ulid } from "ulid";

// Publishes a self-hosted OTA update:
// 1. expo export -> dist/ (JS bundle + assets + metadata.json)
// 2. copy the export into the server's storage dir
// 3. build the Expo manifest from metadata.json
// 4. POST it to the server's admin /api/updates endpoint
//
// Env: PLATFORM (ios|android), RUNTIME_VERSION, CHANNEL, SERVER_BASE_URL,
// ADMIN_PUBLISH_TOKEN, SERVER_STORAGE_DIR (absolute path to apps/server/updates).

const platform = process.env.PLATFORM ?? "ios";
const runtimeVersion = process.env.RUNTIME_VERSION ?? "1.0.0";
const channel = process.env.CHANNEL ?? "production";
const serverBaseUrl = process.env.SERVER_BASE_URL ?? "http://localhost:4000";
const adminToken = process.env.ADMIN_PUBLISH_TOKEN ?? "dev-admin-token-change-me";
const serverStorageDir =
  process.env.SERVER_STORAGE_DIR ?? join(import.meta.dir, "../../server/updates");

const updateId = crypto.randomUUID();
const storageRel = join(runtimeVersion, ulid());
const destDir = join(serverStorageDir, storageRel);

console.log("Exporting JS bundle…");
await $`npx expo export --platform ${platform} --output-dir dist`;

mkdirSync(destDir, { recursive: true });
cpSync("dist", destDir, { recursive: true });

const metadata = JSON.parse(readFileSync(join("dist", "metadata.json"), "utf8"));
const fileMeta = metadata.fileMetadata[platform];

function assetUrl(filePath: string) {
  return `${serverBaseUrl}/api/assets?asset=${encodeURIComponent(join(storageRel, filePath))}&runtimeVersion=${runtimeVersion}&platform=${platform}`;
}

const manifest = {
  id: updateId,
  createdAt: new Date().toISOString(),
  runtimeVersion,
  launchAsset: {
    key: "bundle",
    contentType: "application/javascript",
    url: assetUrl(fileMeta.bundle),
  },
  assets: (fileMeta.assets as Array<{ path: string; ext: string }>).map((a) => ({
    key: a.path,
    contentType: a.ext === "png" ? "image/png" : "application/octet-stream",
    url: assetUrl(a.path),
  })),
  metadata: {},
  extra: {},
};

console.log("Publishing manifest to server…");
const res = await fetch(`${serverBaseUrl}/api/updates`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({ updateId, runtimeVersion, platform, channel, storagePath: storageRel, manifest }),
});
if (!res.ok) throw new Error(`Publish failed: ${res.status} ${await res.text()}`);
console.log(`Published update ${updateId} for runtimeVersion ${runtimeVersion} (${platform}/${channel}).`);
