import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { logger } from "@/common/logger";
import { healthRoutes } from "@/routes/health.routes";
import { authRoutes } from "@/routes/auth.routes";
import { todoRoutes } from "@/routes/todo.routes";
import { updatesRoutes } from "@/routes/updates.routes";

// Per-request start times for access-log latency (keyed by the Request object).
const requestStart = new WeakMap<Request, number>();

export const app = new Elysia()
  .use(cors())
  .use(swagger({ path: "/docs" }))
  // Access log: one line per incoming API call and one per response (method,
  // path, status, latency). Shows up in the server console / pino output.
  .onRequest(({ request }) => {
    requestStart.set(request, Date.now());
    logger.info({ method: request.method, path: new URL(request.url).pathname }, "→ request");
  })
  .onAfterResponse(({ request, set }) => {
    const start = requestStart.get(request);
    logger.info(
      {
        method: request.method,
        path: new URL(request.url).pathname,
        status: set.status ?? 200,
        ms: start ? Date.now() - start : undefined,
      },
      "← response",
    );
  })
  .onError(({ code, error, set }) => {
    logger.error({ code, err: error }, "request_error");
    if (code === "VALIDATION") {
      set.status = 422;
      return { error: { code: "VALIDATION", message: String(error) } };
    }
    set.status = code === "NOT_FOUND" ? 404 : 500;
    return { error: { code: String(code), message: "Request failed" } };
  })
  .use(healthRoutes)
  .use(authRoutes)
  .use(todoRoutes)
  .use(updatesRoutes);

export default app;
