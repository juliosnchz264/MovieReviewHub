"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bookmark,
  Heart,
  LayoutGrid,
  List,
  MessageSquare,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";

export type ProfileTab =
  | "overview"
  | "lists"
  | "reviews"
  | "ratings"
  | "watchlist"
  | "favorites";

const OWNER_TABS: readonly ProfileTab[] = [
  "overview",
  "lists",
  "reviews",
  "ratings",
  "watchlist",
  "favorites",
] as const;

const PUBLIC_TABS: readonly ProfileTab[] = ["overview", "lists"] as const;

export function getVisibleTabs(isOwner: boolean): readonly ProfileTab[] {
  return isOwner ? OWNER_TABS : PUBLIC_TABS;
}

interface Props {
  active: ProfileTab;
  isOwner: boolean;
}

export function ProfileTabs({ active, isOwner }: Props) {
  const t = useTranslate();
  const pathname = usePathname();
  const params = useSearchParams();

  const allTabs: { key: ProfileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: t("profile.overview"), icon: LayoutGrid },
    { key: "lists", label: t("profile.listsTab"), icon: List },
    { key: "reviews", label: t("profile.reviewsTab"), icon: MessageSquare },
    { key: "ratings", label: t("profile.ratingsTab"), icon: Star },
    { key: "watchlist", label: t("profile.watchlistTab"), icon: Bookmark },
    { key: "favorites", label: t("profile.favoritesTab"), icon: Heart },
  ];
  const visible = getVisibleTabs(isOwner);
  const tabs = allTabs.filter((tab) => visible.includes(tab.key));

  function hrefFor(key: ProfileTab): string {
    const sp = new URLSearchParams(params.toString());
    if (key === "overview") sp.delete("tab");
    else sp.set("tab", key);
    const q = sp.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  return (
    <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-background/85 px-4 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={hrefFor(tab.key)}
              role="tab"
              aria-selected={isActive}
              scroll={false}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm transition",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
