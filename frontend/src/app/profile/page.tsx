"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

export default function ProfileRedirectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if (user) {
      const q = params.toString();
      router.replace(q ? `/users/${user.id}?${q}` : `/users/${user.id}`);
    }
  }, [accessToken, user, params, router]);

  return null;
}
