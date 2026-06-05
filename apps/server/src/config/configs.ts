function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  adminPublishToken: required("ADMIN_PUBLISH_TOKEN"),
  updatesStorageDir: process.env.UPDATES_STORAGE_DIR ?? "./updates",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:4000",
  codeSigningPrivateKeyPath:
    process.env.CODE_SIGNING_PRIVATE_KEY_PATH ?? "./keys/private-key.pem",
};
