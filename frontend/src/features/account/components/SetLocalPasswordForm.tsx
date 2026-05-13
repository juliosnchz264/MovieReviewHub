"use client";

import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useSetLocalPassword } from "@/features/account/hooks/useAccountMutations";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import type { ApiError } from "@/types/auth";

interface Props {
  providerLabel?: string;
}

export function SetLocalPasswordForm({ providerLabel }: Props) {
  const t = useTranslate();
  const qc = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clear);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const set = useSetLocalPassword();

  const minLengthOk = newPassword.length >= 8;
  const matchesConfirm = newPassword === confirm && confirm.length > 0;

  const canSubmit =
    minLengthOk && matchesConfirm && !set.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    set.mutate(
      { newPassword },
      {
        onSuccess: () => {
          toast.success(t("security.setPasswordSaved"));
          clearAuth();
          qc.clear();
          window.location.assign("/login");
        },
      }
    );
  }

  const error = set.error as AxiosError<ApiError> | null;
  const errorMessage = error?.response?.data?.message ?? (set.isError ? t("security.setPasswordError") : null);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("security.setPasswordDesc", { provider: providerLabel ?? "OAuth" })}
      </p>

      <div className="space-y-1.5">
        <label htmlFor="set-new-pass" className="text-sm font-medium">
          {t("security.newPassword")}
        </label>
        <PasswordInput
          id="set-new-pass"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          maxLength={100}
          aria-describedby="set-new-pass-help"
        />
        <div id="set-new-pass-help">
          <PasswordStrengthMeter password={newPassword} />
          {newPassword.length > 0 && !minLengthOk && (
            <p className="text-xs text-destructive">{t("security.passwordMinLength")}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="set-confirm-pass" className="text-sm font-medium">
          {t("security.confirmPassword")}
        </label>
        <PasswordInput
          id="set-confirm-pass"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          aria-invalid={confirm.length > 0 && !matchesConfirm}
        />
        {confirm.length > 0 && !matchesConfirm && (
          <p className="text-xs text-destructive">{t("security.passwordMismatch")}</p>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {set.isPending ? t("security.setPasswordSaving") : t("security.setPasswordCta")}
      </Button>
    </form>
  );
}
