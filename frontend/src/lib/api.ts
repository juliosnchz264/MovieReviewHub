import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/store/auth";
import type { AuthResponse } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { data } = await axios.post<AuthResponse>(
    `${API_URL}/auth/refresh`,
    {},
    { withCredentials: true }
  );
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data.accessToken;
}

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    const isAuthEndpoint =
      original?.url?.includes("/auth/login") ||
      original?.url?.includes("/auth/register") ||
      original?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        useAuthStore.getState().clear();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
