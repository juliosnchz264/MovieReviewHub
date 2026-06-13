"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

/**
 * Redirects to /login if no access token is present once the session has been
 * restored (or the refresh attempt failed). Returns a `ready` flag so the
 * caller can render a placeholder while the restore is in flight, avoiding
 * the FCP-blocking pattern of SessionInit.
 */
export function useRequireAuth(): { ready: boolean; authed: boolean } {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionRestored = useAuthStore((s) => s.sessionRestored);

  useEffect(() => {
    if (sessionRestored && !accessToken) {
      router.replace("/login");
    }
  }, [sessionRestored, accessToken, router]);

  return { ready: sessionRestored, authed: !!accessToken };
}
