import * as dotenv from "dotenv";
import { ExpoConfig, ConfigContext } from "expo/config";
import * as fs from "fs";
import * as path from "path";

const APP_ENV = (process.env.APP_ENV || "local") as "local" | "dev" | "stage" | "prod";
const envFile = path.resolve(__dirname, `.env.${APP_ENV}`);
if (fs.existsSync(envFile)) dotenv.config({ path: envFile, override: true });

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const UPDATES_URL = process.env.UPDATES_URL || "http://localhost:4000/api/manifest";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Todo",
  slug: "todo-app",
  scheme: "todoapp",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.rootlex.todo",
    buildNumber: "1",
  },
  android: {
    package: "com.rootlex.todo",
    versionCode: 1,
  },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: { tsconfigPaths: true },
  // Self-hosted OTA. runtimeVersion is an explicit policy string; bump it only
  // when native code changes (a new native module needs a rebuild, not OTA).
  runtimeVersion: "1.0.0",
  updates: {
    url: UPDATES_URL,
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    ...(process.env.CODE_SIGNING_CERTIFICATE
      ? {
          codeSigningCertificate: process.env.CODE_SIGNING_CERTIFICATE,
          codeSigningMetadata: { keyid: "main", alg: "rsa-v1_5-sha256" },
        }
      : {}),
  },
  extra: {
    APP_ENV,
    API_BASE_URL,
  },
});
