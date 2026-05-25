"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import { useIntersection } from "@/hooks/useIntersection";
import { NotificationItem } from "./NotificationItem";
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "../hooks/useNotifications";
import type {
  NotificationFilter,
  NotificationItem as NotificationDto,
} from "@/types/notification";

export function NotificationsListView() {
  const t = useTranslate();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const intersecting = useIntersection(sentinelRef, { rootMargin: "200px" });

  const query = useNotifications(filter, 20);
  const { data: unread } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const remove = useDeleteNotification();

  useEffect(() => {
    if (intersecting && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [intersecting, query]);

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.content);
  const badge = unread?.count ?? 0;

  function onItemClick(n: NotificationDto) {
    if (!n.read) markRead.mutate([n.id]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("notifications.title")}
          </h1>
          {badge > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("notifications.unreadCount", { n: badge })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={!badge || markAllRead.isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-40"
        >
          <Check className="size-4" />
          {t("notifications.markAllRead")}
        </button>
      </header>

      <div className="mb-4 flex border-b border-border text-sm">
        <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
          {t("notifications.all")}
        </FilterTab>
        <FilterTab
          active={filter === "unread"}
          onClick={() => setFilter("unread")}
        >
          {t("notifications.unread")}
          {badge > 0 ? (
            <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-px text-[10px] text-primary">
              {badge}
            </span>
          ) : null}
        </FilterTab>
      </div>

      {query.isLoading ? (
        <div className="flex min-h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          {t("notifications.empty")}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((n) => (
            <li key={n.id} className="group/notif relative">
              <NotificationItem notification={n} onClick={onItemClick} />
              <button
                type="button"
                aria-label="dismiss"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  remove.mutate(n.id);
                }}
                className="absolute right-2 top-2 hidden rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground group-hover/notif:inline-flex"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="h-10" />
      {query.isFetchingNextPage ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : null}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 transition",
        active
          ? "border-b-2 border-primary font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
