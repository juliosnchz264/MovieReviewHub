"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Pencil } from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  TwitterIcon,
} from "@/features/profile/components/SocialIcons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import { useLocaleStore } from "@/store/locale";
import type { PublicProfile } from "@/types/user";

interface Props {
  profile: PublicProfile;
  isOwner: boolean;
}

export function ProfileHero({ profile, isOwner }: Props) {
  const t = useTranslate();
  const locale = useLocaleStore((s) => s.locale);
  const memberSince = formatMemberSince(profile.memberSince, locale);
  const initials = profile.username.slice(0, 2).toUpperCase();
  const accent = profile.themeColor ? themeAccent(profile.themeColor) : null;
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [prevAvatarUrl, setPrevAvatarUrl] = useState(profile.avatarUrl);
  if (profile.avatarUrl !== prevAvatarUrl) {
    setPrevAvatarUrl(profile.avatarUrl);
    setAvatarBroken(false);
  }
  const showAvatar = Boolean(profile.avatarUrl) && !avatarBroken;
  const hasAccent = accent !== null;

  return (
    <section className="relative isolate overflow-hidden" style={accent ?? undefined}>
      {/* Cover layer (z-0) */}
      <div className="relative z-0 h-44 w-full overflow-hidden sm:h-60 lg:h-72">
        {profile.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.coverUrl}
            alt=""
            className="size-full object-cover"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        ) : hasAccent ? (
          <div
            className="size-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 60%), radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 55%), var(--secondary)",
            }}
          />
        ) : (
          <div className="size-full bg-linear-to-br from-primary/40 via-primary/15 to-secondary" />
        )}

        {/* Soft blurred accent glow (z-0, sits inside cover frame) */}
        {hasAccent && (
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-1/2 h-60 w-[60%] -translate-x-1/2 rounded-full blur-3xl opacity-50"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 65%, transparent), transparent 70%)",
            }}
          />
        )}

        {/* Bottom fade to background */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/95 via-background/30 to-transparent" />
      </div>

      {/* Header content — explicit z-10 so avatar/typography always above cover */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
          <AvatarBlock
            url={showAvatar ? profile.avatarUrl : null}
            initials={initials}
            username={profile.username}
            hasAccent={hasAccent}
            onError={() => setAvatarBroken(true)}
          />

          <div className="text-center sm:pb-2 sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {profile.username}
            </h1>
            {profile.handle && (
              <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            )}
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <CalendarDays className="size-4" aria-hidden />
              <span>{t("profile.memberSince", { date: memberSince })}</span>
            </p>
            <SocialBar social={profile.social} hasAccent={hasAccent} />
          </div>
        </div>

        {isOwner && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="self-center border-border/60 bg-background/60 backdrop-blur-md hover:bg-background/80 sm:self-end"
          >
            <Link href="/profile/edit">
              <Pencil className="mr-2 size-4" />
              {t("nav.editProfile")}
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function AvatarBlock({
  url,
  initials,
  username,
  hasAccent,
  onError,
}: {
  url: string | null;
  initials: string;
  username: string;
  hasAccent: boolean;
  onError: () => void;
}) {
  return (
    <div className="relative -mt-12 sm:-mt-16">
      {/* Accent halo (decorative, behind avatar) */}
      {hasAccent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -m-2 rounded-full blur-md opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, color-mix(in srgb, var(--accent) 60%, transparent), transparent 70%)",
          }}
        />
      )}
      <div
        className={cn(
          "relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-lg sm:size-32"
        )}
        style={
          hasAccent
            ? { boxShadow: "0 0 0 3px var(--accent), 0 10px 20px -5px rgb(0 0 0 / 0.18)" }
            : undefined
        }
      >
        {url ? (
          <Image
            src={url}
            alt={username}
            width={128}
            height={128}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
            unoptimized
            onError={onError}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-secondary text-2xl font-semibold text-foreground">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

function SocialBar({
  social,
  hasAccent,
}: {
  social: PublicProfile["social"];
  hasAccent: boolean;
}) {
  const items: { url: string | null; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { url: social.facebook, icon: FacebookIcon, label: "Facebook" },
    { url: social.instagram, icon: InstagramIcon, label: "Instagram" },
    { url: social.twitter, icon: TwitterIcon, label: "X / Twitter" },
    { url: social.tiktok, icon: TikTokIcon, label: "TikTok" },
  ];
  const visible = items.filter((i) => i.url);
  if (visible.length === 0) return null;
  return (
    <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
      {visible.map(({ url, icon: Icon, label }) => (
        <a
          key={label}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cn(
            "rounded-full border border-border/60 bg-background/60 p-1.5 text-muted-foreground backdrop-blur-md transition",
            hasAccent ? "hover:text-foreground" : "hover:border-primary hover:text-primary"
          )}
          style={
            hasAccent
              ? ({ ["--tw-hover-border" as string]: "var(--accent)" } as React.CSSProperties)
              : undefined
          }
        >
          <Icon className="size-4" />
        </a>
      ))}
    </div>
  );
}

function formatMemberSince(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function themeAccent(color: string): React.CSSProperties | undefined {
  const map: Record<string, string> = {
    rose: "#f43f5e",
    violet: "#8b5cf6",
    indigo: "#6366f1",
    blue: "#3b82f6",
    teal: "#14b8a6",
    green: "#22c55e",
    amber: "#f59e0b",
    orange: "#f97316",
    red: "#ef4444",
    slate: "#64748b",
  };
  const hex = map[color];
  if (!hex) return undefined;
  return { ["--accent" as string]: hex } as React.CSSProperties;
}
