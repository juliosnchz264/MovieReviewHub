import { create } from "zustand";
import type { User } from "@/types/auth";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  /** True once /auth/refresh has resolved (success or failure). */
  sessionRestored: boolean;
  /**
   * Synchronous best-effort signal that a session might be restorable, read
   * from the non-HttpOnly `auth_hint` cookie the backend sets alongside the
   * refresh cookie. Lets the navbar render the authenticated shell on the
   * very first paint instead of flashing the login/register CTAs while
   * /auth/refresh resolves.
   */
  sessionHint: boolean;
  setSession: (token: string, user: User) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User | null) => void;
  markSessionRestored: () => void;
  clear: () => void;
}

function readSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("auth_hint=1"));
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  sessionRestored: false,
  sessionHint: readSessionHint(),
  setSession: (token, user) =>
    set({ accessToken: token, user, sessionRestored: true, sessionHint: true }),
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  markSessionRestored: () => set({ sessionRestored: true }),
  clear: () => set({ accessToken: null, user: null, sessionHint: false }),
}));
