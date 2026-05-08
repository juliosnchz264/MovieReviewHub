"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Film, Tv, Users, MessageSquare, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/movies", label: "Movies", icon: Film },
  { href: "/admin/movies/import", label: "Import movies", icon: Download },
  { href: "/admin/series", label: "Series", icon: Tv },
  { href: "/admin/series/import", label: "Import series", icon: Download },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
];

export function AdminNav() {
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
