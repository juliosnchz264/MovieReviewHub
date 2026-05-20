"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type HeroVideoProps = {
  ariaLabel: string;
  title: string;
  genre: string;
  ctaLabel: string;
  ctaHref: string;
};

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_URL ?? "";

export function HeroVideo({
  ariaLabel,
  title,
  genre,
  ctaLabel,
  ctaHref,
}: HeroVideoProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const webm = `${MEDIA_BASE}/obsession.webm`;
  const mp4 = `${MEDIA_BASE}/obsession.mp4`;
  const poster = `${MEDIA_BASE}/obsession-poster.jpg`;

  return (
    <section
      aria-label={ariaLabel}
      className="relative w-full overflow-hidden bg-black h-[calc(100svh-3.5rem)] min-h-[420px] sm:min-h-[520px] md:min-h-[600px]"
    >
      {reduceMotion ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={ariaLabel}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" />
        </video>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/60 to-transparent sm:h-28 md:h-32"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-background via-black/60 to-transparent sm:h-2/3"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-10 sm:px-6 sm:pb-16 md:px-10 md:pb-20 lg:pb-24">
        <span className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/75 sm:mb-3 sm:text-xs sm:tracking-[0.25em] md:text-sm">
          {genre}
        </span>
        <h1 className="mb-4 text-balance text-4xl font-semibold leading-[1] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)] sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
          {title}
        </h1>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-white/90 sm:px-8 sm:text-base"
          >
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
