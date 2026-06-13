"use client";

import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CastMember } from "@/types/cast";

interface Props {
  member: CastMember;
  className?: string;
}

export function CastCard({ member, className }: Props) {
  return (
    <Link
      href={`/people/${member.tmdbPersonId}`}
      className={cn(
        "group block w-28 shrink-0 snap-start overflow-hidden rounded-xl border border-border/60 bg-card/60 transition hover:border-border hover:shadow-md sm:w-32 md:w-36",
        className
      )}
    >
      <div className="relative aspect-2/3 bg-muted">
        {member.profileUrl ? (
          <Image
            src={member.profileUrl}
            alt={member.name}
            fill
            sizes="(max-width: 640px) 7rem, (max-width: 768px) 8rem, 9rem"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <User className="size-10 opacity-40" aria-hidden />
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-2">
        <p className="line-clamp-1 text-sm font-medium leading-tight">
          {member.name}
        </p>
        {member.character && (
          <p className="line-clamp-1 text-xs text-muted-foreground leading-tight">
            {member.character}
          </p>
        )}
      </div>
    </Link>
  );
}
