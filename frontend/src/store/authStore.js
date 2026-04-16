import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../services/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: async (email, password) => {
        const { data } = await authApi.login({ email, password });
        set({ token: data.access_token });
        const { data: user } = await authApi.me();
        set({ user });
      },

      register: async (email, password, name) => {
        await authApi.register({ email, password, name });
        await get().login(email, password);
      },

      logout: () => set({ token: null, user: null }),

      fetchMe: async () => {
        try {
          const { data } = await authApi.me();
          set({ user: data });
        } catch {
          set({ token: null, user: null });
        }
      },
    }),
    { name: "auth-storage", partialize: (s) => ({ token: s.token }) }
  )
);
