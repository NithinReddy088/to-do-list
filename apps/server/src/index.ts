import app from "./app";
import { config } from "@/config/configs";
import { logger } from "@/common/logger";

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  await app.stop();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app.listen(config.port, () => {
  logger.info({ port: config.port }, `server listening on :${config.port}`);
});
