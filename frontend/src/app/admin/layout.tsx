"use client";

import { useEffect, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNav } from "@/components/admin-nav";
import { useIsAdmin } from "@/features/auth/hooks/useIsAdmin";
import { useAuthStore } from "@/store/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isAdmin, isLoading } = useIsAdmin();

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if (!isLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [accessToken, isAdmin, isLoading, router]);

  if (!accessToken || isLoading || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Checking permissions...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Exit admin
              </Button>
            </Link>
          </div>
        </header>
        <AdminNav />
        <div>{children}</div>
      </div>
    </main>
  );
}
