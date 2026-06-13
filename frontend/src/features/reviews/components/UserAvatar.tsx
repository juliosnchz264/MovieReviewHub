"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + second).toUpperCase();
}

interface Props {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function UserAvatar({ url, name, size = 40, className }: Props) {
  const [broken, setBroken] = useState(false);
  const [prevUrl, setPrevUrl] = useState(url);
  if (url !== prevUrl) {
    setPrevUrl(url);
    setBroken(false);
  }

  if (url && !broken) {
    return (
      <span
        className={cn("relative inline-block overflow-hidden rounded-full bg-muted", className)}
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
      className={cn(
        "grid place-items-center rounded-full bg-primary font-semibold text-primary-foreground",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initialsFrom(name)}
    </span>
  );
}
