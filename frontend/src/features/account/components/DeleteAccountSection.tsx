"use client";

import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteAccount } from "@/features/account/hooks/useAccountMutations";
import { useTranslate } from "@/hooks/useTranslate";
import { PasswordInput } from "./PasswordInput";
import type { ApiError } from "@/types/auth";

interface Props {
  username: string;
  hasLocalPassword: boolean;
  providerLabel?: string;
}

export function DeleteAccountSection({ username, hasLocalPassword, providerLabel }: Props) {
  const t = useTranslate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const del = useDeleteAccount();

  const confirmToken = t("security.deleteConfirmToken");
  const passwordOk = hasLocalPassword ? password.length > 0 : true;
  const canDelete =
    confirmText === confirmToken && passwordOk && !del.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    del.mutate(
      hasLocalPassword ? { currentPassword: password } : {},
      {
        onSuccess: () => {
          toast.success(t("security.deleted"));
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
          <h3 className="font-medium text-destructive">{t("security.deleteTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("security.deleteDesc")}</p>
        </div>
      </div>

      {!open ? (
        <div className="mt-4">
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            {t("security.deleteCta")}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="del-confirm" className="text-sm font-medium">
              {t("security.deleteConfirmPrompt")}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                {confirmToken}
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
              {t("security.deleteAccountLabel")}:{" "}
              <span className="font-mono">{username}</span>
            </p>
          </div>

          {hasLocalPassword ? (
            <div className="space-y-1.5">
              <label htmlFor="del-pass" className="text-sm font-medium">
                {t("security.currentPassword")}
              </label>
              <PasswordInput
                id="del-pass"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("security.deleteHintOauth", { provider: providerLabel ?? "OAuth" })}
            </p>
          )}

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
              {t("security.deleteCancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={!canDelete}>
              {del.isPending ? t("security.deleting") : t("security.deleteSubmit")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
