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
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const slide = slides[activeIndex];
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
      className="relative w-full overflow-hidden bg-black h-[calc(100svh-3.5rem)] min-h-[420px] sm:min-h-[520px] md:min-h-[600px]"
    >
      {reduceMotion ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`poster-${activeIndex}`}
          src={poster}
          alt={slide.ariaLabel}
          className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-700"
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
          className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-700"
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

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-6 sm:px-6 sm:pb-10 md:px-10 md:pb-14 lg:pb-16">
        <div
          key={`content-${activeIndex}`}
          className="animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/75 sm:mb-3 sm:text-xs sm:tracking-[0.25em] md:text-sm">
            {slide.genre}
          </span>
          <h1 className="mb-4 text-balance text-4xl font-semibold leading-[1] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)] sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
            {slide.title}
          </h1>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-white/90 sm:px-8 sm:text-base"
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
            className="absolute left-2 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/55 sm:left-4 sm:size-11 md:left-6 md:size-12 lg:left-10"
          >
            <ChevronLeft className="size-4 sm:size-5 md:size-6" />
          </button>
          <button
            type="button"
            onClick={advance}
            aria-label={nextLabel}
            className="absolute right-2 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/55 sm:right-4 sm:size-11 md:right-6 md:size-12 lg:right-10"
          >
            <ChevronRight className="size-4 sm:size-5 md:size-6" />
          </button>
          <div className="absolute bottom-4 right-4 z-20 flex gap-2 sm:bottom-6 sm:right-6 md:bottom-8 md:right-10">
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
