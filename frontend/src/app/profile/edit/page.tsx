"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { EditProfileForm } from "@/features/profile/components/EditProfileForm";
import { useTranslate } from "@/hooks/useTranslate";

export default function EditProfilePage() {
  const t = useTranslate();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: user } = useCurrentUser();
  const profile = usePublicProfile(user?.id);

  useEffect(() => {
    if (!accessToken) router.replace("/login");
  }, [accessToken, router]);

  if (!accessToken) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("editProfile.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("editProfile.subtitle")}
            </p>
          </header>

          {profile.isLoading || !profile.data ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <EditProfileForm profile={profile.data} />
          )}
        </div>
      </main>
    </>
  );
}
