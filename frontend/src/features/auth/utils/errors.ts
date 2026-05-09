import { AxiosError } from "axios";
import type { ApiError } from "@/types/auth";

export const USE_OAUTH_PROVIDER_CODE = "USE_OAUTH_PROVIDER";

interface OAuthOnlyAccount {
  provider: string;
}

interface ParsedError {
  message: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
  isRateLimited: boolean;
  retryAfterSeconds?: number;
  oauthOnlyAccount?: OAuthOnlyAccount;
}

const SAFE_STATUS_MESSAGES: Record<number, string> = {
  400: "Datos inválidos. Revisa los campos.",
  401: "Credenciales incorrectas.",
  403: "No tienes permiso para esta acción.",
  404: "Recurso no encontrado.",
  409: "Ese usuario o email ya existe.",
  422: "Datos inválidos. Revisa los campos.",
  429: "Demasiados intentos. Espera unos segundos e inténtalo de nuevo.",
  500: "Error del servidor. Inténtalo más tarde.",
  502: "Servicio no disponible. Inténtalo más tarde.",
  503: "Servicio no disponible. Inténtalo más tarde.",
};

interface ApiErrorWithCode extends ApiError {
  code?: string;
  provider?: string;
}

function prettyProvider(raw: string): string {
  const lower = raw.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function parseAuthError(err: unknown, fallback = "Algo salió mal."): ParsedError {
  if (!err) return { message: fallback, isRateLimited: false };

  const axiosErr = err as AxiosError<ApiErrorWithCode>;
  const status = axiosErr.response?.status;
  const data = axiosErr.response?.data;

  if (axiosErr.code === "ERR_NETWORK" || axiosErr.code === "ECONNABORTED") {
    return { message: "Sin conexión con el servidor.", status, isRateLimited: false };
  }

  const isRateLimited = status === 429;
  let retryAfterSeconds: number | undefined;
  if (isRateLimited) {
    const header =
      axiosErr.response?.headers?.["retry-after"] ??
      axiosErr.response?.headers?.["Retry-After"];
    const parsed = typeof header === "string" ? parseInt(header, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) retryAfterSeconds = parsed;
  }

  // OAuth-only account hint (server sends code + provider on 409)
  if (data?.code === USE_OAUTH_PROVIDER_CODE && data.provider) {
    const pretty = prettyProvider(data.provider);
    return {
      message: `Esta cuenta se creó con ${pretty}. Continúa con ${pretty} para iniciar sesión.`,
      status,
      isRateLimited: false,
      oauthOnlyAccount: { provider: data.provider },
    };
  }

  // never expose raw server message verbatim — map by status
  const message =
    (status && SAFE_STATUS_MESSAGES[status]) ||
    (data?.message && status && status < 500 ? data.message : fallback);

  return {
    message,
    status,
    fieldErrors: data?.validationErrors,
    isRateLimited,
    retryAfterSeconds,
  };
}
