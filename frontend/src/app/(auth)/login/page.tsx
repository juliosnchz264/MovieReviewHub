"use client";

import { FormEvent, Suspense, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/features/account/components/PasswordInput";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { parseAuthError } from "@/features/auth/utils/errors";
import { useTranslate } from "@/hooks/useTranslate";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "No se pudo iniciar sesión con Google.",
  oauth_user_rejected: "Tu cuenta de Google no se pudo vincular.",
  oauth_internal_error: "Error interno al iniciar sesión.",
  oauth_session_failed: "La sesión no pudo restaurarse. Inténtalo de nuevo.",
};

function OAuthErrorToaster() {
  const params = useSearchParams();
  useEffect(() => {
    const oauthError = params.get("error");
    if (oauthError) {
      const msg = OAUTH_ERROR_MESSAGES[oauthError] ?? "No se pudo iniciar sesión.";
      toast.error(msg);
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [params]);
  return null;
}

export default function LoginPage() {
  const t = useTranslate();
  const router = useRouter();
  const login = useLogin();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          toast.success(t("auth.welcomeBack"));
          router.push("/dashboard");
        },
      }
    );
  }

  const parsed = login.error ? parseAuthError(login.error) : null;
  const message = parsed?.message;
  const hasError = Boolean(message);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <OAuthErrorToaster />
      </Suspense>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("auth.loginTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
      </div>

      <GoogleButton label={t("auth.continueWithGoogle")} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("auth.orContinueWith")}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={emailId} className="text-sm font-medium">
            {t("auth.email")}
          </label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            required
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={passwordId} className="text-sm font-medium">
              {t("auth.password")}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
              tabIndex={0}
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id={passwordId}
            autoComplete="current-password"
            required
            showCapsLockHint
            capsLockMessage={t("auth.capsLockOn")}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
          />
        </div>

        {message && (
          <p
            id={errorId}
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {message}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={login.isPending}
          className="w-full"
        >
          {login.isPending ? t("auth.submitLoggingIn") : t("auth.submitLogin")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-foreground hover:underline">
          {t("auth.goRegister")}
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        {t("auth.legalNotice")}
      </p>
    </div>
  );
}
