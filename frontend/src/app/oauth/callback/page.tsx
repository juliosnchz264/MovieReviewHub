"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";

function CallbackResolver() {
  const router = useRouter();
  const params = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const sessionRestored = useAuthStore((s) => s.sessionRestored);

  useEffect(() => {
    const error = params.get("error");
    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }
    // Wait for SessionInit's /auth/refresh to settle before deciding.
    // Otherwise we redirect to /login on first render (token not yet present).
    if (!sessionRestored) return;
    if (accessToken) {
      router.replace(user?.profileCompleted === false ? "/complete-profile" : "/dashboard");
      return;
    }
    router.replace("/login?error=oauth_session_failed");
  }, [sessionRestored, accessToken, user, params, router]);

  return null;
}

export default function OAuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
      <Suspense fallback={null}>
        <CallbackResolver />
      </Suspense>
    </div>
  );
}
