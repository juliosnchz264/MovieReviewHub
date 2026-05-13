"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Mail, AtSign, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/navbar";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import { AccountSection } from "@/features/account/components/AccountSection";
import { UsernameForm } from "@/features/account/components/UsernameForm";
import { EmailForm } from "@/features/account/components/EmailForm";
import { PasswordForm } from "@/features/account/components/PasswordForm";
import { DeleteAccountSection } from "@/features/account/components/DeleteAccountSection";
import { StatsGrid } from "@/features/account/components/StatsGrid";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}•@${domain}`;
  return `${local.slice(0, 2)}${"•".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

export default function DashboardPage() {
  const t = useTranslate();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
    }
  }, [accessToken, router]);

  if (!accessToken) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <header className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("nav.dashboard")}
            </h1>
            <p className="text-sm text-muted-foreground">
              Tu actividad y configuración de cuenta.
            </p>
          </header>

          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {isError && (
            <p className="text-destructive" role="alert">
              No se pudo cargar la cuenta.
            </p>
          )}

          {user && (
            <>
              {/* Identidad — sin Role expuesto, badge admin solo si aplica */}
              <section className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
                <div
                  aria-hidden
                  className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary"
                >
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-medium">{user.username}</h2>
                    {user.role === "ROLE_ADMIN" && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        <Shield className="size-3" aria-hidden />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {maskEmail(user.email)}
                  </p>
                </div>
                {user.role === "ROLE_ADMIN" && (
                  <Link href="/admin/dashboard">
                    <Button size="sm">{t("nav.adminPanel")}</Button>
                  </Link>
                )}
              </section>

              <StatsGrid />

              <div className="flex flex-wrap gap-2">
                <Link href="/movies">
                  <Button variant="outline" size="sm">
                    {t("nav.movies")}
                  </Button>
                </Link>
                <Link href="/series">
                  <Button variant="outline" size="sm">
                    {t("nav.series")}
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" size="sm">
                    {t("nav.profile")}
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Configuración de cuenta
                </h2>

                <AccountSection
                  title="Nombre de usuario"
                  description="Visible públicamente en tus reseñas."
                  preview={
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <AtSign className="size-3.5" aria-hidden />
                      {user.username}
                    </span>
                  }
                >
                  <UsernameForm
                    currentUsername={user.username}
                    hasLocalPassword={user.hasPassword}
                    providerLabel={user.provider ?? undefined}
                  />
                </AccountSection>

                <AccountSection
                  title="Correo electrónico"
                  description="Solo se usa para iniciar sesión y notificaciones."
                  preview={
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5" aria-hidden />
                      {maskEmail(user.email)}
                    </span>
                  }
                >
                  <EmailForm
                    currentEmail={user.email}
                    hasLocalPassword={user.hasPassword}
                    providerLabel={user.provider ?? undefined}
                  />
                </AccountSection>

                <AccountSection
                  title="Contraseña"
                  description="Cambiarla cerrará todas tus sesiones."
                  preview={
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Lock className="size-3.5" aria-hidden />
                      ••••••••
                    </span>
                  }
                >
                  <PasswordForm />
                </AccountSection>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-wide text-destructive/80">
                  Zona de peligro
                </h2>
                <DeleteAccountSection
                  username={user.username}
                  hasLocalPassword={user.hasPassword}
                  providerLabel={user.provider ?? undefined}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
