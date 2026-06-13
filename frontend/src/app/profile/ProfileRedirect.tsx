"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

export function ProfileRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, authed } = useRequireAuth();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!ready || !authed) return;
    if (user) {
      const q = params.toString();
      router.replace(q ? `/users/${user.id}?${q}` : `/users/${user.id}`);
    }
  }, [ready, authed, user, params, router]);

  return null;
}
