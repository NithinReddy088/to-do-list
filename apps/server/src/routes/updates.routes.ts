import { Elysia } from "elysia";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "@/config/configs";
import { updatesService } from "@/services/updates.service";

const BOUNDARY = "expo-manifest-boundary";

function multipartManifest(manifest: object, signature: string): Response {
  const body =
    `--${BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="manifest"\r\n` +
    `Content-Type: application/json\r\n` +
    `expo-signature: sig="${signature}", keyid="main"\r\n\r\n` +
    `${JSON.stringify(manifest)}\r\n` +
    `--${BOUNDARY}--\r\n`;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": `multipart/mixed; boundary=${BOUNDARY}`,
      "expo-protocol-version": "1",
      "expo-sfv-version": "0",
      "cache-control": "private, max-age=0",
    },
  });
}

export const updatesRoutes = new Elysia({ prefix: "/api" })
  // Expo Updates manifest endpoint. Client sends expo-* headers.
  .get("/manifest", async ({ headers, set }) => {
    const platform = headers["expo-platform"] ?? "ios";
    const runtimeVersion = headers["expo-runtime-version"] ?? "1.0.0";
    const channel = headers["expo-channel-name"] ?? "production";
    const result = await updatesService.getLatestManifest({ platform, runtimeVersion, channel });
    if (!result) {
      set.status = 404;
      return { error: { code: "NO_UPDATE", message: "No update available" } };
    }
    return multipartManifest(result.manifest, result.signature);
  })
  // Serves the JS bundle and individual assets by file path under storage.
  .get("/assets", ({ query, set }) => {
    const assetPath = query.asset;
    if (!assetPath) {
      set.status = 400;
      return { error: { code: "MISSING_ASSET", message: "asset query param required" } };
    }
    const full = join(config.updatesStorageDir, assetPath);
    if (!existsSync(full)) {
      set.status = 404;
      return { error: { code: "ASSET_NOT_FOUND", message: "Asset not found" } };
    }
    set.headers["content-type"] = query.contentType ?? "application/octet-stream";
    return new Response(createReadStream(full) as unknown as ReadableStream);
  })
  // Admin publish endpoint. Expects the export to already be on disk under
  // storagePath; records the precomputed manifest as the latest update.
  .post("/updates", async ({ headers, body, set }) => {
    if (headers.authorization !== `Bearer ${config.adminPublishToken}`) {
      set.status = 401;
      return { error: { code: "UNAUTHORIZED", message: "Admin token required" } };
    }
    const b = body as {
      updateId: string; runtimeVersion: string; platform: string;
      channel: string; storagePath: string; manifest: any;
    };
    await updatesService.recordUpdate(b);
    return { ok: true, updateId: b.updateId };
  });
