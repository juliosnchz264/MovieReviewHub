"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientPortal } from "@/components/ui/client-portal";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClientPortal>
      <div className="fixed inset-0 z-60 isolate flex items-center justify-center p-4">
        <button
          aria-label="Close"
          type="button"
          onClick={() => !submitting && onClose()}
          className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className={cn(
            "relative z-10 w-full max-w-sm space-y-4 rounded-xl border border-border bg-popover p-5 shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          <div className="space-y-1.5">
            <h2 id="confirm-title" className="text-base font-semibold">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? "..." : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </ClientPortal>
  );
}
