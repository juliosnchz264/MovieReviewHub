"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  minLength?: number;
}

interface Score {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  className: string;
}

function scorePassword(pw: string, minLength: number): Score {
  if (!pw) return { level: 0, label: "", className: "" };

  let points = 0;
  if (pw.length >= minLength) points++;
  if (pw.length >= 12) points++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++;
  if (/\d/.test(pw)) points++;
  if (/[^A-Za-z0-9]/.test(pw)) points++;

  // common-pattern penalties
  if (/^[a-z]+$/i.test(pw)) points = Math.max(0, points - 1);
  if (/(.)\1{2,}/.test(pw)) points = Math.max(0, points - 1);
  if (/^(?:123|abc|qwerty|password|admin)/i.test(pw)) points = 0;

  const level = (Math.min(4, points) | 0) as Score["level"];
  const labels = ["", "Muy débil", "Débil", "Aceptable", "Fuerte"];
  const colors = [
    "",
    "bg-destructive",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-emerald-500",
  ];
  return {
    level,
    label: labels[level] ?? "",
    className: colors[level] ?? "",
  };
}

export function PasswordStrength({ password, minLength = 8 }: PasswordStrengthProps) {
  const score = useMemo(() => scorePassword(password, minLength), [password, minLength]);
  const filled = score.level;

  if (!password) return null;

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={filled} aria-label="Fuerza de la contraseña">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= filled ? score.className : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {score.label}
      </p>
    </div>
  );
}
