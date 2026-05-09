"use client";

import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useChangePassword } from "@/features/account/hooks/useAccountMutations";
import { useAuthStore } from "@/store/auth";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import type { ApiError } from "@/types/auth";

export function PasswordForm() {
  const qc = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clear);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = useChangePassword();

  const minLengthOk = newPassword.length >= 8;
  const matchesConfirm = newPassword === confirm && confirm.length > 0;
  const differentFromCurrent = newPassword !== currentPassword || newPassword === "";

  const canSubmit =
    currentPassword.length > 0 &&
    minLengthOk &&
    matchesConfirm &&
    differentFromCurrent &&
    !change.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success("Contraseña cambiada. Por seguridad inicia sesión de nuevo.");
          clearAuth();
          qc.clear();
          // Redireccion dura: evita carrera con el useEffect del dashboard
          // y garantiza que la siguiente pagina arranque sin estado residual.
          window.location.assign("/login");
        },
      }
    );
  }

  const error = change.error as AxiosError<ApiError> | null;
  const errorMessage = error?.response?.data?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="current-pass" className="text-sm font-medium">
          Contraseña actual
        </label>
        <PasswordInput
          id="current-pass"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="new-pass" className="text-sm font-medium">
          Contraseña nueva
        </label>
        <PasswordInput
          id="new-pass"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          maxLength={100}
          aria-describedby="new-pass-help"
        />
        <div id="new-pass-help">
          <PasswordStrengthMeter password={newPassword} />
          {newPassword.length > 0 && !minLengthOk && (
            <p className="text-xs text-destructive">Mínimo 8 caracteres.</p>
          )}
          {newPassword.length > 0 && !differentFromCurrent && (
            <p className="text-xs text-destructive">
              La nueva contraseña debe ser distinta a la actual.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm-pass" className="text-sm font-medium">
          Confirmar contraseña nueva
        </label>
        <PasswordInput
          id="confirm-pass"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          aria-invalid={confirm.length > 0 && !matchesConfirm}
        />
        {confirm.length > 0 && !matchesConfirm && (
          <p className="text-xs text-destructive">Las contraseñas no coinciden.</p>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {change.isPending ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
