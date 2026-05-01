"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useAuthStore } from "@/store/auth";

export default function DashboardPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: user, isLoading, isError } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
    }
  }, [accessToken, router]);

  function onLogout() {
    logout.mutate(undefined, {
      onSettled: () => router.push("/login"),
    });
  }

  if (!accessToken) return null;

  return (
    <main className="flex min-h-screen flex-col gap-6 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <Button variant="outline" onClick={onLogout} disabled={logout.isPending}>
            {logout.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading...</p>}
        {isError && <p className="text-destructive">Failed to load user</p>}

        {user && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">Profile</h2>
            <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Username</dt>
              <dd>{user.username}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user.email}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">
                  {user.role}
                </span>
              </dd>
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}
