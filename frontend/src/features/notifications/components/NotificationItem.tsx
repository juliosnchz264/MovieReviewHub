"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import type { NotificationItem as Notification } from "@/types/notification";
import { notificationHref } from "../utils/notificationLink";
import { formatRelative } from "../utils/formatRelative";

interface Props {
  notification: Notification;
  onClick?: (n: Notification) => void;
}

export function NotificationItem({ notification, onClick }: Props) {
  const t = useTranslate();
  const href = notificationHref(notification);
  const message = buildMessage(notification, t);
  const timestamp = formatRelative(notification.createdAt);
  const initials = notification.actor?.username?.slice(0, 2).toUpperCase() ?? "??";

  const content = (
    <div
      className={cn(
        "flex w-full items-start gap-3 px-3 py-3 text-left transition",
        href ? "hover:bg-muted" : "opacity-70",
        !notification.read && "bg-primary/5"
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          url={notification.actor?.avatarUrl ?? null}
          initials={initials}
        />
        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-background ring-2 ring-background">
          {notification.type === "REVIEW_LIKED" || notification.type === "REPLY_LIKED" ? (
            <Heart className="size-3 fill-red-500 text-red-500" />
          ) : (
            <MessageSquare className="size-3 text-primary" />
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{message}</p>
        {notification.target?.preview ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            &ldquo;{notification.target.preview}&rdquo;
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">{timestamp}</p>
      </div>

      {notification.target?.posterUrl ? (
        <span className="relative ml-2 hidden h-14 w-10 shrink-0 overflow-hidden rounded sm:block">
          <Image
            src={notification.target.posterUrl}
            alt=""
            fill
            sizes="40px"
            className="object-cover"
            unoptimized
          />
        </span>
      ) : null}

      {!notification.read ? (
        <span
          aria-hidden
          className="ml-2 mt-2 size-2 shrink-0 rounded-full bg-primary"
        />
      ) : null}
    </div>
  );

  if (!href) {
    return <div className="block w-full">{content}</div>;
  }

  return (
    <Link
      href={href}
      onClick={() => onClick?.(notification)}
      className="block w-full focus:outline-none focus-visible:bg-muted"
    >
      {content}
    </Link>
  );
}

function buildMessage(
  n: Notification,
  t: ReturnType<typeof useTranslate>
): React.ReactNode {
  const actor = n.actor?.username ?? t("notifications.someone");
  const title = n.target?.title;
  const more = n.groupCount > 1 ? n.groupCount - 1 : 0;
  const verbKey = verbKeyFor(n.type);

  return (
    <>
      <strong>{actor}</strong>
      {more > 0 ? <> {t("notifications.andOthers", { n: more })}</> : null}{" "}
      {t(`notifications.${verbKey}`)}
      {title ? (
        <>
          {" "}
          <span className="text-muted-foreground">{title}</span>
        </>
      ) : null}
    </>
  );
}

function verbKeyFor(type: Notification["type"]): string {
  switch (type) {
    case "REVIEW_LIKED":
      return "likedYourReview";
    case "REVIEW_REPLIED":
      return "repliedYourReview";
    case "REPLY_ANSWERED":
      return "repliedYourComment";
    case "REPLY_LIKED":
      return "likedYourComment";
    case "THREAD_ACTIVITY":
      return "commentedInThread";
  }
}

function Avatar({ url, initials }: { url: string | null; initials: string }) {
  if (url) {
    return (
      <span className="relative inline-block size-9 overflow-hidden rounded-full bg-muted">
        <Image
          src={url}
          alt=""
          fill
          sizes="36px"
          className="object-cover"
          unoptimized
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }
  return (
    <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {initials}
    </span>
  );
}
