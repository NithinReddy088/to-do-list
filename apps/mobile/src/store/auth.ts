import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api, setAuthToken } from "@/services/api/client";

const TOKEN_KEY = "auth_token";

interface User {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      setAuthToken(token);
      set({ token });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setAuthToken(data.token);
    set({ token: data.token, user: data.user });
  },

  register: async (email, password) => {
    const { data } = await api.post("/auth/register", { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setAuthToken(data.token);
    set({ token: data.token, user: data.user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    set({ token: null, user: null });
  },
}));
