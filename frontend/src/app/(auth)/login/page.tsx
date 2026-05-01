"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { useLogin } from "@/features/auth/hooks/useLogin";
import type { ApiError } from "@/types/auth";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => router.push("/dashboard"),
      }
    );
  }

  const error = login.error as AxiosError<ApiError> | null;
  const message = error?.response?.data?.message ?? error?.message;

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back to MovieReviewHub.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {message && (
          <p className="text-sm text-destructive">{message}</p>
        )}

        <Button type="submit" size="lg" disabled={login.isPending} className="w-full">
          {login.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
