"use client";

import { Info } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useTranslate } from "@/hooks/useTranslate";
import { AccountSection } from "@/features/account/components/AccountSection";
import { UsernameForm } from "@/features/account/components/UsernameForm";
import { EmailForm } from "@/features/account/components/EmailForm";
import { PasswordForm } from "@/features/account/components/PasswordForm";
import { SetLocalPasswordForm } from "@/features/account/components/SetLocalPasswordForm";
import { DeleteAccountSection } from "@/features/account/components/DeleteAccountSection";
import { ProviderBadge } from "@/features/account/components/ProviderBadge";

export default function SecurityPage() {
  const t = useTranslate();
  const { ready, authed } = useRequireAuth();
  const { data: user, isLoading } = useCurrentUser();

  if (!ready || !authed) return null;

  const provider = user?.provider ?? null;
  const providerLabel = provider
    ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : null;
  const hasLocalPassword = user?.hasPassword === true;
  const isOAuthLinked = Boolean(provider);

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {t("security.title")}
              </h1>
              {isOAuthLinked && provider && <ProviderBadge provider={provider} />}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("security.subtitle")}
            </p>
            {isOAuthLinked && !hasLocalPassword && providerLabel && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-muted-foreground">
                  {t("security.providerLinkedNotice", { provider: providerLabel })}
                </p>
              </div>
            )}
          </header>

          {isLoading || !user ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <AccountSection
                title={t("security.sectionUsername")}
                description={t("security.sectionUsernameDesc")}
                preview={<span className="font-mono">{user.username}</span>}
              >
                <UsernameForm
                  currentUsername={user.username}
                  hasLocalPassword={hasLocalPassword}
                  providerLabel={providerLabel ?? undefined}
                />
              </AccountSection>

              <AccountSection
                title={t("security.sectionEmail")}
                description={t("security.sectionEmailDesc")}
                preview={<span className="text-muted-foreground">{user.email}</span>}
              >
                <EmailForm
                  currentEmail={user.email}
                  hasLocalPassword={hasLocalPassword}
                  providerLabel={providerLabel ?? undefined}
                />
              </AccountSection>

              <AccountSection
                title={
                  hasLocalPassword
                    ? t("security.sectionPassword")
                    : t("security.setPasswordTitle")
                }
                description={
                  hasLocalPassword
                    ? t("security.sectionPasswordDesc")
                    : t("security.setPasswordDesc", {
                        provider: providerLabel ?? "OAuth",
                      })
                }
              >
                {hasLocalPassword ? (
                  <PasswordForm />
                ) : (
                  <SetLocalPasswordForm providerLabel={providerLabel ?? undefined} />
                )}
              </AccountSection>

              <AccountSection
                title={t("security.sectionDelete")}
                description={t("security.sectionDeleteDesc")}
              >
                <DeleteAccountSection
                  username={user.username}
                  hasLocalPassword={hasLocalPassword}
                  providerLabel={providerLabel ?? undefined}
                />
              </AccountSection>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
