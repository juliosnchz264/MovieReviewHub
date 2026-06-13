"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type HeroSlide = {
  videoBase: string;
  ariaLabel: string;
  title: string;
  genre: string;
  ctaLabel: string;
  ctaHref: string;
};

type HeroVideoProps = {
  slides: HeroSlide[];
  prevLabel: string;
  nextLabel: string;
};

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_URL ?? "";

function assetUrls(base: string) {
  return {
    webm: `${MEDIA_BASE}/${base}.webm`,
    mp4: `${MEDIA_BASE}/${base}.mp4`,
    poster: `${MEDIA_BASE}/${base}-poster.jpg`,
  };
}

export function HeroVideo({ slides, prevLabel, nextLabel }: HeroVideoProps) {
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const slide = slides[activeIndex];
  if (!slide) return null;
  const { webm, mp4, poster } = assetUrls(slide.videoBase);

  const advance = () => {
    setActiveIndex((i) => (i + 1) % slides.length);
  };

  const goPrev = () => {
    setActiveIndex((i) => (i - 1 + slides.length) % slides.length);
  };

  return (
    <section
      aria-label={slide.ariaLabel}
      className="relative isolate w-full overflow-hidden bg-black h-[min(78svh,720px)] min-h-[480px] sm:h-[min(82svh,780px)] md:h-[min(86svh,820px)] lg:h-[calc(100svh-3.5rem)] lg:max-h-[900px]"
    >
      {reduceMotion ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`poster-${activeIndex}`}
          src={poster}
          alt={slide.ariaLabel}
          className="absolute inset-0 h-full w-full object-cover object-[center_30%] sm:object-center animate-in fade-in duration-700"
        />
      ) : (
        <video
          key={`video-${activeIndex}`}
          aria-hidden
          autoPlay
          muted
          playsInline
          preload="metadata"
          poster={poster}
          onEnded={advance}
          className="absolute inset-0 h-full w-full object-cover object-[center_30%] sm:object-center animate-in fade-in duration-700"
        >
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" />
        </video>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/30 to-transparent sm:h-32 md:h-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/85 to-transparent sm:h-3/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 bg-gradient-to-r from-black/40 to-transparent md:block"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-10 pt-20 sm:px-6 sm:pb-14 md:px-10 md:pb-16 lg:pb-20">
        <div
          key={`content-${activeIndex}`}
          className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/80 sm:mb-3 sm:text-xs sm:tracking-[0.28em] md:text-sm">
            {slide.genre}
          </span>
          <h1
            className="mb-5 text-balance font-semibold leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] sm:mb-6"
            style={{ fontSize: "clamp(2.25rem, 7vw + 0.5rem, 5.5rem)" }}
          >
            {slide.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-lg shadow-black/20 hover:bg-white/90 sm:h-12 sm:px-8 sm:text-base"
            >
              <Link href={slide.ctaHref}>{slide.ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label={prevLabel}
            className="absolute left-2 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:left-4 sm:flex sm:size-11 md:left-6 md:size-12 lg:left-10"
          >
            <ChevronLeft className="size-5 md:size-6" />
          </button>
          <button
            type="button"
            onClick={advance}
            aria-label={nextLabel}
            className="absolute right-2 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:right-4 sm:flex sm:size-11 md:right-6 md:size-12 lg:right-10"
          >
            <ChevronRight className="size-5 md:size-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 md:bottom-8 md:right-10">
            {slides.map((s, idx) => (
              <button
                key={s.videoBase}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
                aria-current={idx === activeIndex}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIndex
                    ? "w-8 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
