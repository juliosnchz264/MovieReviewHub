"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAvailability } from "@/features/account/hooks/useAvailability";
import { useCompleteProfile } from "@/features/auth/hooks/useCompleteProfile";
import { useAuthStore } from "@/store/auth";
import type { ApiError } from "@/types/auth";

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;

export default function CompleteProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const complete = useCompleteProfile();
  const usernameId = useId();
  const errorId = useId();

  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);

  // Bounce out if not authenticated or already completed.
  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if (user?.profileCompleted) {
      router.replace("/dashboard");
    }
  }, [accessToken, user, router]);

  const availability = useAvailability({
    field: "username",
    value: username,
    currentValue: user?.username ?? "",
    minLength: 3,
  });

  const trimmed = username.trim();
  const formatValid = USERNAME_RE.test(trimmed);
  const showFormatError = touched && trimmed.length > 0 && !formatValid;
  const isAvailable = availability.available === true;
  const isUnavailable = availability.available === false && !availability.sameAsCurrent;
  const canSubmit =
    formatValid &&
    !complete.isPending &&
    !availability.isChecking &&
    !isUnavailable;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    complete.mutate(trimmed, {
      onSuccess: () => {
        toast.success("Perfil completado. ¡Bienvenida/o a MovieReviewHub!");
        router.replace("/dashboard");
      },
    });
  }

  const error = complete.error as AxiosError<ApiError> | null;
  const serverMessage =
    error?.response?.status === 409
      ? error.response.data?.message ?? "Ese nombre no está disponible."
      : error
      ? "No se pudo guardar el nombre. Inténtalo de nuevo."
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Último paso
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Elige tu nombre en la comunidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu nombre aparecerá en cada reseña. Puede ser cualquier alias —
            no tiene por qué ser tu nombre real.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={usernameId} className="text-sm font-medium">
              Nombre de usuario
            </label>
            <Input
              id={usernameId}
              type="text"
              autoComplete="off"
              autoFocus
              required
              minLength={3}
              maxLength={50}
              placeholder="ej. cinefilo_silencioso"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={showFormatError || isUnavailable || undefined}
              aria-describedby={errorId}
            />
            <p className="text-xs text-muted-foreground">
              Entre 3 y 50 caracteres. Letras, números, puntos, guiones o guiones bajos.
            </p>

            <div id={errorId} aria-live="polite" className="min-h-[1rem]">
              {showFormatError && (
                <p className="text-xs text-destructive">
                  Solo letras, números, puntos, guiones o guiones bajos.
                </p>
              )}
              {!showFormatError && availability.isChecking && formatValid && (
                <p className="text-xs text-muted-foreground">Comprobando disponibilidad...</p>
              )}
              {!showFormatError && !availability.isChecking && isUnavailable && (
                <p className="text-xs text-destructive">Ese nombre ya está en uso.</p>
              )}
              {!showFormatError && !availability.isChecking && isAvailable && (
                <p className="text-xs text-emerald-500 dark:text-emerald-400">
                  Disponible.
                </p>
              )}
            </div>
          </div>

          {serverMessage && (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverMessage}
            </p>
          )}

          <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
            {complete.isPending ? "Guardando..." : "Continuar"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Podrás cambiarlo más tarde desde tu perfil.
        </p>
      </div>
    </main>
  );
}
