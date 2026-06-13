"use client";

import { ReactNode, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AuthResponse } from "@/types/auth";

/**
 * Restores the session from the refresh cookie in the background. Does NOT
 * block rendering — public pages render immediately. Components that
 * strictly require auth gate on `sessionRestored` from the auth store.
 */
export function SessionInit({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const markSessionRestored = useAuthStore((s) => s.markSessionRestored);

  useEffect(() => {
    let cancelled = false;

    api
      .post<AuthResponse>("/auth/refresh", {})
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        if (data && typeof data === "object" && typeof data.accessToken === "string") {
          setSession(data.accessToken, data.user);
        }
      })
      .catch(() => {
        // No refresh cookie, expired, or non-JSON response — user is anon.
      })
      .finally(() => {
        if (!cancelled) markSessionRestored();
      });

    return () => {
      cancelled = true;
    };
  }, [setSession, markSessionRestored]);

  return <>{children}</>;
}
