"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

const COMPLETE_PROFILE_PATH = "/complete-profile";

// Routes a user with an incomplete profile is allowed to visit. Anything
// outside this list redirects to /complete-profile.
const ALLOWED_WHILE_INCOMPLETE = new Set<string>([
  COMPLETE_PROFILE_PATH,
  "/oauth/callback",
]);

export function ProfileGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    if (!user.profileCompleted && !ALLOWED_WHILE_INCOMPLETE.has(pathname)) {
      router.replace(COMPLETE_PROFILE_PATH);
      return;
    }

    if (user.profileCompleted && pathname === COMPLETE_PROFILE_PATH) {
      router.replace("/dashboard");
    }
  }, [user, pathname, router]);

  return <>{children}</>;
}
