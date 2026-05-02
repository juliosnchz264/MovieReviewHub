"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useTranslate } from "@/hooks/useTranslate";

export function UserMenu() {
  const t = useTranslate();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!accessToken) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">{t("nav.signIn")}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">{t("nav.register")}</Link>
        </Button>
      </div>
    );
  }

  const initials =
    user?.username?.slice(0, 2).toUpperCase() ?? "??";

  function onLogout() {
    setOpen(false);
    logout.mutate(undefined, {
      onSettled: () => router.push("/"),
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-sm transition hover:bg-muted"
      >
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">{user?.username}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="py-1 text-sm">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted"
            >
              <User className="size-4" />
              {t("nav.dashboard")}
            </Link>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted"
            >
              <User className="size-4" />
              {t("nav.profile")}
            </Link>
            {user?.role === "ROLE_ADMIN" && (
              <Link
                href="/admin/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted"
              >
                <Shield className="size-4" />
                {t("nav.adminPanel")}
              </Link>
            )}
            <button
              onClick={onLogout}
              disabled={logout.isPending}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-destructive hover:bg-muted disabled:opacity-50"
            >
              <LogOut className="size-4" />
              {logout.isPending ? "..." : t("nav.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
