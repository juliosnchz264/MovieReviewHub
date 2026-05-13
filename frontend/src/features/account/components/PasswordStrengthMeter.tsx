"use client";

import { useTranslate } from "@/hooks/useTranslate";

interface Props {
  password: string;
}

interface Score {
  level: 0 | 1 | 2 | 3 | 4;
  color: string;
}

function scorePassword(pw: string): Score {
  if (!pw) return { level: 0, color: "bg-muted" };

  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;

  const level = Math.min(s, 4) as Score["level"];
  const colors: Record<Score["level"], string> = {
    0: "bg-muted",
    1: "bg-destructive",
    2: "bg-orange-500",
    3: "bg-yellow-500",
    4: "bg-emerald-500",
  };
  return { level, color: colors[level] };
}

export function PasswordStrengthMeter({ password }: Props) {
  const t = useTranslate();
  const { level, color } = scorePassword(password);

  if (!password) return null;

  const labelKey = (
    [
      "",
      "security.passwordStrengthVeryWeak",
      "security.passwordStrengthWeak",
      "security.passwordStrengthOk",
      "security.passwordStrengthStrong",
    ] as const
  )[level];
  const label = labelKey ? t(labelKey) : "";

  return (
    <div
      className="space-y-1"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              n <= level ? color : "bg-muted"
            }`}
          />
        ))}
      </div>
      {label && (
        <p className="text-xs text-muted-foreground">
          {label}
          <span className="ml-2 text-muted-foreground/60">
            ({t("security.passwordStrengthHint")})
          </span>
        </p>
      )}
    </div>
  );
}
