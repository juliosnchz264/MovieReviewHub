"use client";

import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteAccount } from "@/features/account/hooks/useAccountMutations";
import { PasswordInput } from "./PasswordInput";
import type { ApiError } from "@/types/auth";

const CONFIRM_TOKEN = "ELIMINAR";

interface Props {
  username: string;
}

export function DeleteAccountSection({ username }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const del = useDeleteAccount();

  const canDelete =
    confirmText === CONFIRM_TOKEN && password.length > 0 && !del.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    del.mutate(
      { currentPassword: password },
      {
        onSuccess: () => {
          toast.success("Cuenta eliminada. Adiós.");
          qc.clear();
          window.location.assign("/");
        },
      }
    );
  }

  const error = del.error as AxiosError<ApiError> | null;
  const errorMessage = error?.response?.data?.message;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-destructive" aria-hidden />
        <div className="flex-1 space-y-1">
          <h3 className="font-medium text-destructive">Eliminar cuenta</h3>
          <p className="text-sm text-muted-foreground">
            Acción permanente. Tus reviews y favoritos serán anonimizados y no
            podrás recuperar la cuenta.
          </p>
        </div>
      </div>

      {!open ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setOpen(true)}
          >
            Quiero eliminar mi cuenta
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="del-confirm" className="text-sm font-medium">
              Para confirmar, escribe{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                {CONFIRM_TOKEN}
              </code>
            </label>
            <Input
              id="del-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              aria-describedby="del-username-hint"
            />
            <p id="del-username-hint" className="text-xs text-muted-foreground">
              Cuenta: <span className="font-mono">{username}</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="del-pass" className="text-sm font-medium">
              Contraseña actual
            </label>
            <PasswordInput
              id="del-pass"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={!canDelete}>
              {del.isPending ? "Eliminando…" : "Eliminar cuenta definitivamente"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
