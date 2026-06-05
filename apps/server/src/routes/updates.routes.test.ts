import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/adapters/database";
import app from "@/app";
import { updatesService } from "@/services/updates.service";

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
});
