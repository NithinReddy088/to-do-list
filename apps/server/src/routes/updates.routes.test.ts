import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { prisma } from "@/adapters/database";
import app from "@/app";
import { updatesService } from "@/services/updates.service";
import { config } from "@/config/configs";

beforeEach(async () => {
  await prisma.update.deleteMany();
});

describe("updates routes", () => {
  it("returns 404 (no content) when no update is available", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/manifest", {
        headers: {
          "expo-platform": "ios",
          "expo-runtime-version": "1.0.0",
          "expo-channel-name": "production",
          "expo-protocol-version": "1",
        },
      }),
    );
    expect(res.status).toBe(404);
  });

  it("returns a multipart signed manifest when one exists", async () => {
    await updatesService.recordUpdate({
      updateId: "550e8400-e29b-41d4-a716-446655440000",
      runtimeVersion: "1.0.0", platform: "ios", channel: "production",
      storagePath: "updates/1.0.0/abc",
      manifest: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: "2026-06-05T00:00:00.000Z",
        runtimeVersion: "1.0.0",
        launchAsset: { key: "bundle", contentType: "application/javascript", url: "http://x/bundle" },
        assets: [], metadata: {}, extra: {},
      },
    });
    const res = await app.handle(
      new Request("http://localhost/api/manifest", {
        headers: {
          "expo-platform": "ios",
          "expo-runtime-version": "1.0.0",
          "expo-channel-name": "production",
          "expo-protocol-version": "1",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("multipart/mixed");
    const text = await res.text();
    expect(text).toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(text).toContain("expo-signature");
  });

  // ── Asset path-traversal security tests ─────────────────────────────────────

  it("rejects path-traversal in GET /api/assets (dot-dot-slash)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/assets?asset=../../../../etc/passwd"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ASSET_PATH");
  });

  it("rejects path-traversal in GET /api/assets (url-encoded dots)", async () => {
    // %2e%2e%2f = ../  — servers must decode before path check
    const res = await app.handle(
      new Request("http://localhost/api/assets?asset=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ASSET_PATH");
  });

  describe("GET /api/assets — valid in-dir asset", () => {
    const storageDir = resolve(config.updatesStorageDir);
    const probeFile = join(storageDir, "_probe.txt");
    const probeContent = "probe-ok-content";

    beforeEach(() => {
      if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });
      writeFileSync(probeFile, probeContent, "utf8");
    });

    afterEach(() => {
      if (existsSync(probeFile)) unlinkSync(probeFile);
    });

    it("serves a file that lives inside the storage directory", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/assets?asset=_probe.txt&contentType=text/plain"),
      );
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe(probeContent);
    });
  });

  // ── Publish body-validation tests ───────────────────────────────────────────

  it("rejects malformed publish body (missing manifest) with 422", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/updates", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.adminPublishToken}`,
        },
        body: JSON.stringify({
          updateId: "abc",
          runtimeVersion: "1.0.0",
          platform: "ios",
          channel: "production",
          storagePath: "updates/x",
          // manifest intentionally omitted
        }),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("rejects publish with wrong admin token with 401", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/updates", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer wrong-token",
        },
        body: JSON.stringify({
          updateId: "abc",
          runtimeVersion: "1.0.0",
          platform: "ios",
          channel: "production",
          storagePath: "updates/x",
          manifest: {},
        }),
      }),
    );
    expect(res.status).toBe(401);
  });
});
