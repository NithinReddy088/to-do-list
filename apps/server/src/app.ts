import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { logger } from "@/common/logger";
import { healthRoutes } from "@/routes/health.routes";
import { authRoutes } from "@/routes/auth.routes";

export const app = new Elysia()
  .use(cors())
  .use(swagger({ path: "/docs" }))
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
  .use(authRoutes);

export default app;
