"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";

function CallbackResolver() {
  const router = useRouter();
  const params = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const error = params.get("error");
    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (accessToken) {
      router.replace(user?.profileCompleted === false ? "/complete-profile" : "/dashboard");
      return;
    }
    // SessionInit already ran by the time this page mounts. If there's no
    // access token now, the refresh cookie was missing, blocked, or rejected.
    router.replace("/login?error=oauth_session_failed");
  }, [accessToken, user, params, router]);

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
