import Constants from "expo-constants";

interface AppExtra {
  APP_ENV: string;
  API_BASE_URL: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

export const env = {
  appEnv: extra.APP_ENV ?? "local",
  apiBaseUrl: extra.API_BASE_URL ?? "http://localhost:4000",
};
