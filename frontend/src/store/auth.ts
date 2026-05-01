import { create } from "zustand";
import type { User } from "@/types/auth";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (token, user) => set({ accessToken: token, user }),
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}));
