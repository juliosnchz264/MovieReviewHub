"use client";

interface Props {
  password: string;
}

interface Score {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

function scorePassword(pw: string): Score {
  if (!pw) return { level: 0, label: "", color: "bg-muted" };

  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;

  const level = Math.min(s, 4) as Score["level"];
  const map: Record<Score["level"], { label: string; color: string }> = {
    0: { label: "", color: "bg-muted" },
    1: { label: "Muy débil", color: "bg-destructive" },
    2: { label: "Débil", color: "bg-orange-500" },
    3: { label: "Aceptable", color: "bg-yellow-500" },
    4: { label: "Fuerte", color: "bg-emerald-500" },
  };
  return { level, ...map[level] };
}

export function PasswordStrengthMeter({ password }: Props) {
  const { level, label, color } = scorePassword(password);

  if (!password) return null;

  return (
    <div
      className="space-y-1"
      role="status"
      aria-live="polite"
      aria-label={`Password strength: ${label}`}
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
            (mínimo 8 caracteres, combina mayúsculas, números y símbolos)
          </span>
        </p>
      )}
    </div>
  );
}
