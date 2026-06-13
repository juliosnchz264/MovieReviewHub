import { NextResponse, type NextRequest } from "next/server";
import { backendApiBase } from "@/lib/server-api";

/**
 * Canonicalizes legacy numeric URLs to slug URLs with a 301.
 *
 *   /movies/76        -> /movies/interstellar
 *   /series/55        -> /series/breaking-bad
 *   /people/525       -> /people/christopher-nolan   (cast-card links)
 *   /users/1          -> /users/boss26
 *
 * Only fires when the first path segment is purely numeric (an old id), so
 * normal slug requests pass straight through with zero backend calls. The
 * [slug] routes still resolve numeric ids directly, so a failed/slow resolve
 * here just means the page renders without canonicalization — never a break.
 */
const NUMERIC = /^\d+$/;

async function resolveSlug(
  base: string,
  type: "movies" | "series" | "people",
  id: string
): Promise<string | null> {
  try {
    const res = await fetch(`${base}/${type}/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { slug?: string };
    return data.slug ?? null;
  } catch {
    return null;
  }
}

async function resolveUsername(base: string, id: string): Promise<string | null> {
  try {
    const res = await fetch(`${base}/users/${id}/profile`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { username?: string };
    return data.username ?? null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const base = backendApiBase();
  if (!base) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const parts = pathname.split("/").filter(Boolean); // ["movies","76", ...rest]
  const [type, id, ...rest] = parts;

  if (!id || !NUMERIC.test(id)) return NextResponse.next();

  let canonical: string | null = null;
  if (type === "movies" || type === "series" || type === "people") {
    canonical = await resolveSlug(base, type, id);
  } else if (type === "users") {
    canonical = await resolveUsername(base, id);
  } else {
    return NextResponse.next();
  }

  if (!canonical) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/" + [type, canonical, ...rest].join("/");
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ["/movies/:path*", "/series/:path*", "/people/:path*", "/users/:path*"],
};
