"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/features/account/components/PasswordInput";
import { PasswordStrength } from "@/features/auth/components/PasswordStrength";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { useRegister } from "@/features/auth/hooks/useRegister";
import { parseAuthError } from "@/features/auth/utils/errors";
import { useTranslate } from "@/hooks/useTranslate";

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;
const MIN_PASSWORD = 8;

export default function RegisterPage() {
  const t = useTranslate();
  const router = useRouter();
  const register = useRegister();

  const usernameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const errorId = useId();
  const usernameHintId = useId();
  const passwordHintId = useId();
  const confirmErrId = useId();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirm: false,
  });

  const localErrors = useMemo(() => {
    return {
      username:
        touched.username && username && !USERNAME_RE.test(username)
          ? t("auth.usernameHint")
          : null,
      password:
        touched.password && password && password.length < MIN_PASSWORD
          ? t("auth.passwordTooShort")
          : null,
      confirm:
        touched.confirm && confirm && confirm !== password
          ? t("auth.passwordMismatch")
          : null,
    };
  }, [username, password, confirm, touched, t]);

  const formValid =
    USERNAME_RE.test(username) &&
    email.includes("@") &&
    password.length >= MIN_PASSWORD &&
    confirm === password;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirm: true });
    if (!formValid) return;

    register.mutate(
      { username: username.trim(), email: email.trim(), password },
      {
        onSuccess: () => {
          toast.success(t("auth.accountCreated"));
          router.push("/login");
        },
      }
    );
  }

  const parsed = register.error ? parseAuthError(register.error) : null;
  const fieldErrors = parsed?.fieldErrors;
  const showGenericError = parsed && !fieldErrors;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("auth.registerTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.registerSubtitle")}
        </p>
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
          <label htmlFor={usernameId} className="text-sm font-medium">
            {t("auth.username")}
          </label>
          <Input
            id={usernameId}
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={50}
            autoFocus
            placeholder={t("auth.usernamePlaceholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, username: true }))}
            aria-invalid={Boolean(localErrors.username || fieldErrors?.username) || undefined}
            aria-describedby={`${usernameHintId}${
              localErrors.username || fieldErrors?.username ? ` ${usernameHintId}-err` : ""
            }`}
          />
          <p id={usernameHintId} className="text-xs text-muted-foreground">
            {t("auth.usernameHint")}
          </p>
          {(localErrors.username || fieldErrors?.username?.[0]) && (
            <p
              id={`${usernameHintId}-err`}
              className="text-xs text-destructive"
              aria-live="polite"
            >
              {localErrors.username ?? fieldErrors?.username?.[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={emailId} className="text-sm font-medium">
            {t("auth.email")}
          </label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
            aria-invalid={Boolean(fieldErrors?.email) || undefined}
          />
          {fieldErrors?.email?.[0] && (
            <p className="text-xs text-destructive" aria-live="polite">
              {fieldErrors.email[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={passwordId} className="text-sm font-medium">
            {t("auth.password")}
          </label>
          <PasswordInput
            id={passwordId}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            showCapsLockHint
            capsLockMessage={t("auth.capsLockOn")}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            aria-invalid={Boolean(localErrors.password || fieldErrors?.password) || undefined}
            aria-describedby={passwordHintId}
          />
          <PasswordStrength password={password} minLength={MIN_PASSWORD} />
          <p id={passwordHintId} className="text-xs text-muted-foreground">
            {t("auth.passwordRequirements")}
          </p>
          {(localErrors.password || fieldErrors?.password?.[0]) && (
            <p className="text-xs text-destructive" aria-live="polite">
              {localErrors.password ?? fieldErrors?.password?.[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={confirmId} className="text-sm font-medium">
            {t("auth.passwordConfirm")}
          </label>
          <PasswordInput
            id={confirmId}
            autoComplete="new-password"
            required
            showCapsLockHint
            capsLockMessage={t("auth.capsLockOn")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
            aria-invalid={Boolean(localErrors.confirm) || undefined}
            aria-describedby={localErrors.confirm ? confirmErrId : undefined}
          />
          {localErrors.confirm && (
            <p
              id={confirmErrId}
              className="text-xs text-destructive"
              aria-live="polite"
            >
              {localErrors.confirm}
            </p>
          )}
        </div>

        {showGenericError && (
          <p
            id={errorId}
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {parsed.message}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={register.isPending}
          className="w-full"
        >
          {register.isPending
            ? t("auth.submitRegistering")
            : t("auth.submitRegister")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          {t("auth.goLogin")}
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        {t("auth.legalNotice")}
      </p>
    </div>
  );
}
