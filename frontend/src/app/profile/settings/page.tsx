"use client";

import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AccountSettingsForm } from "@/features/profile/components/AccountSettingsForm";
import { useAccountSettings } from "@/features/profile/hooks/usePublicProfile";
import { useTranslate } from "@/hooks/useTranslate";

export default function AccountSettingsPage() {
  const t = useTranslate();
  const { ready, authed } = useRequireAuth();
  const { data, isLoading } = useAccountSettings();

  if (!ready || !authed) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("accountSettings.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("accountSettings.subtitle")}
            </p>
          </header>

          {isLoading || !data ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <AccountSettingsForm initial={data} />
          )}
        </div>
      </main>
    </>
  );
}
