"use client";

import { Check, Loader2, X } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";

type Status = "idle" | "checking" | "available" | "taken" | "error";

interface Props {
  status: Status;
  messages?: Partial<Record<Status, string>>;
}

export function FieldStatus({ status, messages }: Props) {
  const t = useTranslate();
  if (status === "idle") return null;

  const defaults: Record<Status, string> = {
    idle: "",
    checking: t("security.statusChecking"),
    available: t("security.statusAvailable"),
    taken: t("security.statusTaken"),
    error: t("security.statusError"),
  };
  const text = messages?.[status] ?? defaults[status];

  const icon = {
    checking: <Loader2 className="size-3.5 animate-spin" aria-hidden />,
    available: <Check className="size-3.5" aria-hidden />,
    taken: <X className="size-3.5" aria-hidden />,
    error: <X className="size-3.5" aria-hidden />,
    idle: null,
  }[status];

  const tone = {
    checking: "text-muted-foreground",
    available: "text-emerald-600 dark:text-emerald-400",
    taken: "text-destructive",
    error: "text-destructive",
    idle: "",
  }[status];

  return (
    <p
      className={`flex items-center gap-1.5 text-xs ${tone}`}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span>{text}</span>
    </p>
  );
}

export type FieldStatusValue = Status;
