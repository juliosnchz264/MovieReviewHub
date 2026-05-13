"use client";

import { FormEvent, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAvailability } from "@/features/account/hooks/useAvailability";
import { useUpdateUsername } from "@/features/account/hooks/useAccountMutations";
import { useTranslate } from "@/hooks/useTranslate";
import { FieldStatus, type FieldStatusValue } from "./FieldStatus";
import { PasswordInput } from "./PasswordInput";
import type { ApiError } from "@/types/auth";

const USERNAME_RX = /^[A-Za-z0-9_.-]+$/;

interface Props {
  currentUsername: string;
  hasLocalPassword: boolean;
  providerLabel?: string;
}

export function UsernameForm({ currentUsername, hasLocalPassword, providerLabel }: Props) {
  const t = useTranslate();
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [currentPassword, setCurrentPassword] = useState("");
  const updateUsername = useUpdateUsername();

  const trimmed = newUsername.trim();
  const formatValid = USERNAME_RX.test(trimmed);
  const lengthValid = trimmed.length >= 3 && trimmed.length <= 50;

  const { available, isChecking, sameAsCurrent } = useAvailability({
    field: "username",
    value: trimmed,
    currentValue: currentUsername,
  });

  const status: FieldStatusValue = useMemo(() => {
    if (sameAsCurrent || !lengthValid || !formatValid) return "idle";
    if (isChecking) return "checking";
    if (available === true) return "available";
    if (available === false) return "taken";
    return "idle";
  }, [available, isChecking, sameAsCurrent, lengthValid, formatValid]);

  const passwordOk = hasLocalPassword ? currentPassword.length > 0 : true;
  const canSubmit =
    !sameAsCurrent &&
    lengthValid &&
    formatValid &&
    available === true &&
    passwordOk &&
    !updateUsername.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    updateUsername.mutate(
      hasLocalPassword
        ? { newUsername: trimmed, currentPassword }
        : { newUsername: trimmed },
      {
        onSuccess: () => {
          toast.success(t("security.usernameUpdated"));
          setCurrentPassword("");
        },
      }
    );
  }

  const error = updateUsername.error as AxiosError<ApiError> | null;
  const errorMessage = error?.response?.data?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="new-username" className="text-sm font-medium">
          {t("security.newUsername")}
        </label>
        <Input
          id="new-username"
          autoComplete="username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          aria-invalid={!sameAsCurrent && (!formatValid || !lengthValid || available === false)}
          aria-describedby="username-help username-status"
          maxLength={50}
        />
        <div id="username-help" className="space-y-0.5">
          {!lengthValid && trimmed.length > 0 && (
            <p className="text-xs text-destructive">{t("security.usernameLengthInvalid")}</p>
          )}
          {trimmed.length > 0 && !formatValid && (
            <p className="text-xs text-destructive">{t("security.usernameFormatInvalid")}</p>
          )}
        </div>
        <div id="username-status">
          <FieldStatus status={status} />
        </div>
      </div>

      {hasLocalPassword ? (
        <div className="space-y-1.5">
          <label htmlFor="username-current-pass" className="text-sm font-medium">
            {t("security.currentPassword")}
          </label>
          <PasswordInput
            id="username-current-pass"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">{t("security.currentPasswordHint")}</p>
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
        {updateUsername.isPending ? t("security.saving") : t("security.save")}
      </Button>
    </form>
  );
}
