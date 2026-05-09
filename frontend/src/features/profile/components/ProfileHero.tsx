"use client";

import Link from "next/link";
import { CalendarDays, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicProfile } from "@/types/user";

interface Props {
  profile: PublicProfile;
  isOwner: boolean;
}

export function ProfileHero({ profile, isOwner }: Props) {
  const memberSince = formatMemberSince(profile.memberSince);
  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <section className="relative">
      <div
        className={cn(
          "relative h-44 w-full overflow-hidden sm:h-60 lg:h-72",
          !profile.coverUrl &&
            "bg-linear-to-br from-primary/40 via-primary/15 to-secondary"
        )}
      >
        {profile.coverUrl && (
          // URL controlada por el usuario; <img> evita lockdown de next/image y
          // ya está restringida a https en backend (UpdateProfileRequest).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.coverUrl}
            alt=""
            className="size-full object-cover"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background/85 via-background/20 to-transparent" />
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
          <div className="-mt-12 size-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-md sm:-mt-16 sm:size-32">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-secondary text-2xl font-semibold text-foreground">
                {initials}
              </div>
            )}
          </div>

          <div className="text-center sm:pb-2 sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              @{profile.username}
            </h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <CalendarDays className="size-4" aria-hidden />
              <span>Miembro desde {memberSince}</span>
            </p>
          </div>
        </div>

        {isOwner && (
          <Button asChild variant="outline" size="sm" className="self-center sm:self-end">
            <Link href="/profile">
              <Pencil className="mr-2 size-4" />
              Editar perfil
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function formatMemberSince(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es", { month: "long", year: "numeric" });
}
