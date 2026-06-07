import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { env } from "@/config/env";

export const api = axios.create({ baseURL: env.apiBaseUrl, timeout: 15000 });

// Per-request start times for latency logging (keyed by the config object so we
// don't have to mutate/augment axios's config type).
const startedAt = new WeakMap<InternalAxiosRequestConfig, number>();

// Log every outgoing API call and its result to the Metro/dev console. This is
// dev-facing observability; it logs method, full URL, status, and latency.
api.interceptors.request.use((config) => {
  startedAt.set(config, Date.now());
  const method = config.method?.toUpperCase() ?? "GET";
  console.log(`[API →] ${method} ${(config.baseURL ?? "") + (config.url ?? "")}`);
  return config;
});

api.interceptors.response.use(
  (response) => {
    const ms = Date.now() - (startedAt.get(response.config) ?? Date.now());
    const method = response.config.method?.toUpperCase() ?? "GET";
    console.log(`[API ←] ${response.status} ${method} ${response.config.url} (${ms}ms)`);
    return response;
  },
  (error) => {
    const config = error?.config as InternalAxiosRequestConfig | undefined;
    const ms = config ? Date.now() - (startedAt.get(config) ?? Date.now()) : 0;
    const method = config?.method?.toUpperCase() ?? "";
    const status = error?.response?.status ?? "ERR";
    console.log(`[API ✗] ${status} ${method} ${config?.url ?? ""} (${ms}ms) — ${error?.message ?? "error"}`);
    return Promise.reject(error);
  },
);

// Token is injected by the auth store once the user logs in.
export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}
