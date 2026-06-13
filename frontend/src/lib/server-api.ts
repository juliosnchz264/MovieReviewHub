// Server-only helper for resolving the backend API base. NEXT_PUBLIC_API_URL
// may be a relative path ("/api/v1") for the Vercel cookie proxy, which is not
// usable from server-side fetch — prefer BACKEND_ORIGIN when available.
export function backendApiBase(): string | null {
  const origin = process.env.BACKEND_ORIGIN;
  if (origin) return `${origin.replace(/\/$/, "")}/api/v1`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) return apiUrl;
  return null;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  timeoutMs = 5000,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Safe JSON parser for server-side fetch. Returns null if the response is
 * missing, non-2xx, missing a JSON content-type, or contains a body that
 * doesn't parse as JSON. Prevents an HTML error page from a misconfigured
 * backend host (or an upstream 404) bubbling up as a SyntaxError into the
 * RSC tree and triggering the global error.tsx boundary.
 */
export async function safeJson<T>(res: Response | null): Promise<T | null> {
  if (!res || !res.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
