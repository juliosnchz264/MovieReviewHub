import { api } from "@/lib/api";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

// OAuth2 redirects live at the server root, not under /api/v1. Si
// NEXT_PUBLIC_API_URL es relativo ("/api/v1") usamos window.location.origin
// para que los rewrites de Vercel proxyen /oauth2/* al backend (cookie
// first-party).
function oauthBaseOrigin(): string {
  if (/^https?:\/\//i.test(API_URL)) {
    try {
      const url = new URL(API_URL);
      return `${url.protocol}//${url.host}`;
    } catch {
      // fall through
    }
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

export const authService = {
  async register(payload: RegisterRequest): Promise<User> {
    const { data } = await api.post<User>("/auth/register", payload);
    return data;
  },

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>("/users/me");
    return data;
  },

  async completeProfile(username: string): Promise<User> {
    const { data } = await api.post<User>("/users/me/profile/complete", { username });
    return data;
  },

  loginWithGoogle(redirectTo?: string): void {
    if (typeof window === "undefined") return;
    const url = new URL(`${oauthBaseOrigin()}/oauth2/authorization/google`);
    if (redirectTo) {
      // server should validate this against an allow-list before honoring it
      url.searchParams.set("redirect_uri", redirectTo);
    }
    window.location.assign(url.toString());
  },
};
