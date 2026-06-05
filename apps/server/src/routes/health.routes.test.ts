import { describe, it, expect } from "bun:test";
import { healthRoutes } from "@/routes/health.routes";

describe("health route", () => {
  it("returns ok status", async () => {
    const res = await healthRoutes.handle(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
