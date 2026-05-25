"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import { useAuthStore } from "@/store/auth";
import { NotificationItem } from "./NotificationItem";
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
  useMarkSeen,
  useNotifications,
  useUnreadCount,
} from "../hooks/useNotifications";
import { useNotificationsStream } from "../hooks/useNotificationsStream";
import type {
  NotificationFilter,
  NotificationItem as NotificationDto,
} from "@/types/notification";

export function NotificationsBell() {
  const t = useTranslate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const ref = useRef<HTMLDivElement>(null);

  // SSE keeps the bell live; polling stays as a fallback for dropped sockets.
  useNotificationsStream();

  const { data: unread } = useUnreadCount();
  const query = useNotifications(filter, 10);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const markSeen = useMarkSeen();
  const remove = useDeleteNotification();

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

  // When the bell opens, mark all visible unread as "seen" so the badge drops
  // without forcing the user to click each one. Read state still requires a
  // click on the individual item.
  useEffect(() => {
    if (open && unread && unread.count > 0) {
      markSeen.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!accessToken) return null;

  const badge = unread?.count ?? 0;
  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.content);
  const isLoading = query.isLoading;
  const isFetchingMore = query.isFetchingNextPage;
  const hasMore = query.hasNextPage;

  function onItemClick(n: NotificationDto) {
    if (!n.read) markRead.mutate([n.id]);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("notifications.title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="size-5" />
        {badge > 0 ? (
          <span
            aria-label={t("notifications.unreadCount", { n: badge })}
            className="absolute -right-0.5 -top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("notifications.title")}
          className={cn(
            "absolute right-0 top-full z-50 mt-2",
            "w-[min(22rem,calc(100vw-1.5rem))] max-w-sm",
            "overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">{t("notifications.title")}</h2>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={!badge || markAllRead.isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <Check className="size-3.5" />
              {t("notifications.markAllRead")}
            </button>
          </div>

          <div className="flex border-b border-border text-xs">
            <FilterTab
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
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

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <EmptyState>
                <Loader2 className="size-4 animate-spin" />
              </EmptyState>
            ) : items.length === 0 ? (
              <EmptyState>{t("notifications.empty")}</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className="group/notif relative"
                    onMouseDownCapture={(e) => {
                      // Right-click swallowed by browser; provide a desktop affordance:
                      // shift-click removes the notification.
                      if (e.shiftKey) {
                        e.preventDefault();
                        remove.mutate(n.id);
                      }
                    }}
                  >
                    <NotificationItem
                      notification={n}
                      onClick={onItemClick}
                    />
                  </li>
                ))}
                {hasMore ? (
                  <li>
                    <button
                      type="button"
                      disabled={isFetchingMore}
                      onClick={() => query.fetchNextPage()}
                      className="flex w-full items-center justify-center gap-2 px-3 py-3 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {isFetchingMore ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      {t("notifications.loadMore")}
                    </button>
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-3 py-2 text-center text-xs font-medium text-primary hover:bg-muted"
          >
            {t("notifications.viewAll")}
          </Link>
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
        "flex-1 px-3 py-2 transition",
        active
          ? "border-b-2 border-primary font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-32 items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
