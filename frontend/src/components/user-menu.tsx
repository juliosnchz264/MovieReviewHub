"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  ChevronDown,
  Heart,
  List,
  Lock,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Star,
  UserCog,
} from "lucide-react";
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
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

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??";
  const profileHref = user ? `/users/${user.id}` : "/";

  function close() {
    setOpen(false);
  }

  function onLogout() {
    close();
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
        aria-label={t("nav.profile")}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-1 py-1 text-sm transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Avatar url={user?.avatarUrl ?? null} initials={initials} />
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("nav.profile")}
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          <Link
            href={profileHref}
            onClick={close}
            className="flex items-center gap-3 border-b border-border px-3 py-3 hover:bg-muted"
            role="menuitem"
          >
            <Avatar url={user?.avatarUrl ?? null} initials={initials} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.username}</p>
              {user?.handle ? (
                <p className="truncate text-xs text-muted-foreground">
                  @{user.handle}
                </p>
              ) : (
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              )}
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-primary">
                {t("nav.viewProfile")}
              </p>
            </div>
          </Link>

          <MenuSection>
            <MenuItem icon={List} href="/profile?tab=lists" onClick={close}>
              {t("nav.lists")}
            </MenuItem>
            <MenuItem icon={MessageSquare} href="/profile?tab=reviews" onClick={close}>
              {t("nav.reviews")}
            </MenuItem>
            <MenuItem icon={Star} href="/profile?tab=ratings" onClick={close}>
              {t("nav.ratings")}
            </MenuItem>
            <MenuItem icon={Bookmark} href="/profile?tab=watchlist" onClick={close}>
              {t("nav.watchlist")}
            </MenuItem>
            <MenuItem icon={Heart} href="/profile?tab=favorites" onClick={close}>
              {t("nav.favorites")}
            </MenuItem>
          </MenuSection>

          <MenuSection>
            <MenuItem icon={UserCog} href="/profile/edit" onClick={close}>
              {t("nav.editProfile")}
            </MenuItem>
            <MenuItem icon={Settings} href="/profile/settings" onClick={close}>
              {t("nav.accountSettings")}
            </MenuItem>
            <MenuItem icon={Lock} href="/profile/security" onClick={close}>
              {t("nav.security")}
            </MenuItem>
            {user?.role === "ROLE_ADMIN" && (
              <MenuItem icon={Shield} href="/admin/dashboard" onClick={close}>
                {t("nav.adminPanel")}
              </MenuItem>
            )}
          </MenuSection>

          <button
            onClick={onLogout}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-destructive hover:bg-muted disabled:opacity-50"
            role="menuitem"
          >
            <LogOut className="size-4" />
            {logout.isPending ? "..." : t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-1 last:border-b-0" role="group">
      {children}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  href,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </Link>
  );
}

function Avatar({
  url,
  initials,
  size = 28,
}: {
  url: string | null;
  initials: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const [prevUrl, setPrevUrl] = useState(url);
  if (url !== prevUrl) {
    setPrevUrl(url);
    setBroken(false);
  }

  if (url && !broken) {
    return (
      <span
        className="relative inline-block overflow-hidden rounded-full bg-muted"
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

