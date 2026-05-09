export type UserRole = "ROLE_USER" | "ROLE_ADMIN";

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  profileCompleted: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string[]>;
}
