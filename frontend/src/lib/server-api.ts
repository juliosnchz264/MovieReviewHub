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
