import { api } from "@/lib/api";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/types/auth";

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
};
