import { describe, it, expect, beforeEach } from "bun:test";
import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { readFileSync } from "node:fs";
import { prisma } from "@/adapters/database";
import { updatesService } from "@/services/updates.service";

beforeEach(async () => {
  await prisma.update.deleteMany();
});

describe("updatesService", () => {
  it("returns null manifest when no update exists", async () => {
    const result = await updatesService.getLatestManifest({
      platform: "ios", runtimeVersion: "1.0.0", channel: "production",
    });
    expect(result).toBeNull();
  });

  it("records an update and serves a signed manifest", async () => {
    const manifest = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      createdAt: "2026-06-05T00:00:00.000Z",
      runtimeVersion: "1.0.0",
      launchAsset: { key: "bundle", contentType: "application/javascript", url: "http://x/bundle" },
      assets: [],
      metadata: {},
      extra: {},
    };
    await updatesService.recordUpdate({
      updateId: manifest.id, runtimeVersion: "1.0.0", platform: "ios",
      channel: "production", storagePath: "updates/1.0.0/abc", manifest,
    });

    const result = await updatesService.getLatestManifest({
      platform: "ios", runtimeVersion: "1.0.0", channel: "production",
    });
    expect(result).not.toBeNull();
    expect(result!.manifest.id).toBe(manifest.id);

    // Signature verifies against the public key.
    const pub = createPublicKey(readFileSync("keys/public-key.pem", "utf8"));
    const ok = cryptoVerify(
      "RSA-SHA256",
      Buffer.from(JSON.stringify(result!.manifest)),
      pub,
      Buffer.from(result!.signature, "base64"),
    );
    expect(ok).toBe(true);
  });
});
