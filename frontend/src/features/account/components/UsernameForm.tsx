"use client";

import { FormEvent, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAvailability } from "@/features/account/hooks/useAvailability";
import { useUpdateUsername } from "@/features/account/hooks/useAccountMutations";
import { FieldStatus, type FieldStatusValue } from "./FieldStatus";
import { PasswordInput } from "./PasswordInput";
import type { ApiError } from "@/types/auth";

const USERNAME_RX = /^[A-Za-z0-9_.-]+$/;

interface Props {
  currentUsername: string;
}

export function UsernameForm({ currentUsername }: Props) {
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

  const canSubmit =
    !sameAsCurrent &&
    lengthValid &&
    formatValid &&
    available === true &&
    currentPassword.length > 0 &&
    !updateUsername.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    updateUsername.mutate(
      { newUsername: trimmed, currentPassword },
      {
        onSuccess: () => {
          toast.success("Username actualizado");
          setCurrentPassword("");
        },
      }
    );
  }

  const error = updateUsername.error as AxiosError<ApiError> | null;
  const errorMessage = error?.response?.data?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-labelledby="username-form-title">
      <div className="space-y-1.5">
        <label htmlFor="new-username" className="text-sm font-medium">
          Nombre de usuario
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
            <p className="text-xs text-destructive">Entre 3 y 50 caracteres.</p>
          )}
          {trimmed.length > 0 && !formatValid && (
            <p className="text-xs text-destructive">
              Solo letras, números, punto, guion y guion bajo.
            </p>
          )}
        </div>
        <div id="username-status">
          <FieldStatus status={status} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="username-current-pass" className="text-sm font-medium">
          Contraseña actual
        </label>
        <PasswordInput
          id="username-current-pass"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Confirmamos tu identidad para cambios sensibles.
        </p>
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {updateUsername.isPending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
