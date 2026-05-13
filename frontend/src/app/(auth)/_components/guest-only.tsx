"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

interface Props {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Blocks rendering auth pages (login / register) for already-authenticated users
 * and redirects them away. SessionInit gates the entire tree until the refresh
 * attempt resolves, so `accessToken` is reliable on the first paint and there
 * is no flicker.
 */
export function GuestOnly({ children, redirectTo = "/" }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  useEffect(() => {
    if (accessToken) router.replace(redirectTo);
  }, [accessToken, redirectTo, router]);

  if (accessToken) return null;
  return <>{children}</>;
}
