"use client";

import { FormEvent, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAvailability } from "@/features/account/hooks/useAvailability";
import { useUpdateEmail } from "@/features/account/hooks/useAccountMutations";
import { FieldStatus, type FieldStatusValue } from "./FieldStatus";
import { PasswordInput } from "./PasswordInput";
import type { ApiError } from "@/types/auth";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  currentEmail: string;
}

export function EmailForm({ currentEmail }: Props) {
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

  const canSubmit =
    !sameAsCurrent &&
    formatValid &&
    available === true &&
    currentPassword.length > 0 &&
    !updateEmail.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    updateEmail.mutate(
      { newEmail: trimmed, currentPassword },
      {
        onSuccess: () => {
          toast.success("Email actualizado. Las sesiones en otros dispositivos se cerraron.");
          setCurrentPassword("");
        },
      }
    );
  }

  const error = updateEmail.error as AxiosError<ApiError> | null;
  const errorMessage = error?.response?.data?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-labelledby="email-form-title">
      <div className="space-y-1.5">
        <label htmlFor="new-email" className="text-sm font-medium">
          Correo electrónico
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
            <p className="text-xs text-destructive">Formato de email inválido.</p>
          )}
        </div>
        <div id="email-status">
          <FieldStatus status={status} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email-current-pass" className="text-sm font-medium">
          Contraseña actual
        </label>
        <PasswordInput
          id="email-current-pass"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Cambiar el email cierra tus sesiones activas en otros dispositivos.
        </p>
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {updateEmail.isPending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
