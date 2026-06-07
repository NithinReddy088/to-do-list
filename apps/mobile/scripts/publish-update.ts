import { $ } from "bun";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Publishes a self-hosted OTA update by uploading the whole export to the
// server, which writes the files and builds + signs the manifest itself:
// 1. expo export -> dist/ (JS bundle + assets + metadata.json)
// 2. read every file under dist/ -> base64, parse dist/metadata.json
// 3. POST { runtimeVersion, platform, channel, metadata, files } to the
//    server's admin /api/updates endpoint.
//
// Env: PLATFORM (ios|android), RUNTIME_VERSION, CHANNEL, SERVER_BASE_URL,
// ADMIN_PUBLISH_TOKEN. No local filesystem access to the server is needed.

const platform = process.env.PLATFORM ?? "android";
const runtimeVersion = process.env.RUNTIME_VERSION ?? "1.0.0";
const channel = process.env.CHANNEL ?? "production";
const serverBaseUrl = process.env.SERVER_BASE_URL ?? "http://localhost:4000";
const adminToken = process.env.ADMIN_PUBLISH_TOKEN ?? "dev-admin-token-change-me";

console.log(`Exporting JS bundle for ${platform}…`);
await $`npx expo export --platform ${platform} --output-dir dist`;

const distDir = "dist";

// Recursively collect every file under dist/ as { posixRelPath: base64 }.
function collectFiles(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) {
      Object.assign(out, collectFiles(abs));
    } else {
      const relPath = relative(distDir, abs).split(sep).join("/");
      out[relPath] = readFileSync(abs).toString("base64");
    }
  }
  return out;
}

const files = collectFiles(distDir);
const metadata = JSON.parse(readFileSync(join(distDir, "metadata.json"), "utf8"));

console.log(`Uploading ${Object.keys(files).length} files to ${serverBaseUrl}…`);
const res = await fetch(`${serverBaseUrl}/api/updates`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({ runtimeVersion, platform, channel, metadata, files }),
});
if (!res.ok) throw new Error(`Publish failed: ${res.status} ${await res.text()}`);

const { updateId } = (await res.json()) as { updateId: string };
console.log(`Published update ${updateId} for runtimeVersion ${runtimeVersion} (${platform}/${channel}).`);
