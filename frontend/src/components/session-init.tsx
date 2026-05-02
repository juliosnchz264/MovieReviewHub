"use client";

import { ReactNode, useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/auth";
import type { AuthResponse } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export function SessionInit({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;

    axios
      .post<AuthResponse>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        if (!cancelled) {
          setSession(res.data.accessToken, res.data.user);
        }
      })
      .catch(() => {
        // No refresh cookie or expired — user is not logged in.
      })
      .finally(() => {
        if (!cancelled) setRestored(true);
      });

    return () => {
      cancelled = true;
    };
  }, [setSession]);

  if (!restored) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
