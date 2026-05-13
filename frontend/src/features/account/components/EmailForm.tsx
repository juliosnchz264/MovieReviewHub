"use client";

import { FormEvent, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAvailability } from "@/features/account/hooks/useAvailability";
import { useUpdateEmail } from "@/features/account/hooks/useAccountMutations";
import { useTranslate } from "@/hooks/useTranslate";
import { FieldStatus, type FieldStatusValue } from "./FieldStatus";
import { PasswordInput } from "./PasswordInput";
import type { ApiError } from "@/types/auth";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  currentEmail: string;
  hasLocalPassword: boolean;
  providerLabel?: string;
}

export function EmailForm({ currentEmail, hasLocalPassword, providerLabel }: Props) {
  const t = useTranslate();
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const updateEmail = useUpdateEmail();

  const trimmed = newEmail.trim();
  const formatValid = EMAIL_RX.test(trimmed);

  const { available, isChecking, sameAsCurrent } = useAvailability({
    field: "email",
    value: trimmed,
    currentValue: currentEmail,
    minLength: 5,
  });

  const status: FieldStatusValue = useMemo(() => {
    if (sameAsCurrent || !formatValid) return "idle";
    if (isChecking) return "checking";
    if (available === true) return "available";
    if (available === false) return "taken";
    return "idle";
  }, [available, isChecking, sameAsCurrent, formatValid]);

  const passwordOk = hasLocalPassword ? currentPassword.length > 0 : true;
  const canSubmit =
    !sameAsCurrent &&
    formatValid &&
    available === true &&
    passwordOk &&
    !updateEmail.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    updateEmail.mutate(
      hasLocalPassword
        ? { newEmail: trimmed, currentPassword }
        : { newEmail: trimmed },
      {
        onSuccess: () => {
          toast.success(t("security.emailUpdated"));
          setCurrentPassword("");
        },
      }
    );
  }

  const error = updateEmail.error as AxiosError<ApiError> | null;
  const errorMessage = error?.response?.data?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!hasLocalPassword && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="text-amber-900 dark:text-amber-100">
            {t("security.oauthEmailWarning", { provider: providerLabel ?? "OAuth" })}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="new-email" className="text-sm font-medium">
          {t("security.newEmail")}
        </label>
        <Input
          id="new-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          aria-invalid={!sameAsCurrent && trimmed.length > 0 && (!formatValid || available === false)}
          aria-describedby="email-help email-status"
          maxLength={255}
        />
        <div id="email-help">
          {trimmed.length > 0 && !formatValid && (
            <p className="text-xs text-destructive">{t("security.emailFormatInvalid")}</p>
          )}
        </div>
        <div id="email-status">
          <FieldStatus status={status} />
        </div>
      </div>

      {hasLocalPassword ? (
        <div className="space-y-1.5">
          <label htmlFor="email-current-pass" className="text-sm font-medium">
            {t("security.currentPassword")}
          </label>
          <PasswordInput
            id="email-current-pass"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">{t("security.emailCloseSessions")}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("security.noCurrentPasswordHint", { provider: providerLabel ?? "OAuth" })}
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {updateEmail.isPending ? t("security.saving") : t("security.save")}
      </Button>
    </form>
  );
}
