"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Film, Tv, Users, MessageSquare, Download, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";

const ITEMS = [
  { href: "/admin/dashboard", labelKey: "admin.nav.dashboard", icon: LayoutDashboard },
  { href: "/admin/movies", labelKey: "admin.nav.movies", icon: Film },
  { href: "/admin/movies/import", labelKey: "admin.nav.importMovies", icon: Download },
  { href: "/admin/series", labelKey: "admin.nav.series", icon: Tv },
  { href: "/admin/series/import", labelKey: "admin.nav.importSeries", icon: Download },
  { href: "/admin/users", labelKey: "admin.nav.users", icon: Users },
  { href: "/admin/reviews", labelKey: "admin.nav.reviews", icon: MessageSquare },
  { href: "/admin/tmdb-tools", labelKey: "admin.nav.tmdbTools", icon: Link2 },
];

export function AdminNav() {
  const t = useTranslate();
  const pathname = usePathname();

  // Longest matching prefix wins → /admin/movies/import beats /admin/movies.
  const activeHref = ITEMS.reduce<string | null>((best, item) => {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (best === null || item.href.length > best.length) return item.href;
    }
    return best;
  }, null);

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-2">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
