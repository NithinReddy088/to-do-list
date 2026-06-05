import axios from "axios";
import { env } from "@/config/env";

export const api = axios.create({ baseURL: env.apiBaseUrl, timeout: 15000 });

// Token is injected by the auth store once the user logs in.
export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}
