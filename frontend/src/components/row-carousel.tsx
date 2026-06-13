"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";

/**
 * Netflix-style horizontal row.
 *
 * - Hidden native scrollbar (all browsers).
 * - Prev/next arrow buttons that page by ~one viewport width, smooth-scrolled.
 *   Arrows reveal on row hover (desktop) and hide on the edge you can't scroll
 *   toward. On touch the row still swipes; arrows stay hidden (md:flex).
 * - Edge fades hint there is more content in that direction.
 */
export function RowCarousel({ children }: { children: ReactNode }) {
  const t = useTranslate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 4);
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  // Arrows render on every breakpoint. Touch devices have no hover, so they
  // stay visible below md; on md+ they fade in on row hover (Netflix style).
  const arrowBase =
    "absolute top-1/2 z-20 flex -translate-y-1/2 items-center justify-center " +
    "rounded-full border border-border bg-background/80 p-1.5 text-foreground shadow-md " +
    "backdrop-blur transition hover:bg-background sm:p-2 " +
    "opacity-100 md:opacity-0 md:group-hover/row:opacity-100 " +
    "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-ring/40";

  // Wrapper inherits -mx so edge fades/arrows reach the real scroller border.
  return (
    <div className="group/row relative -mx-3 sm:-mx-4">
      <div
        ref={scrollerRef}
        className="touch-pan-x overflow-x-auto overscroll-x-contain scroll-smooth px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4"
      >
        <div className="flex gap-3 sm:gap-4" style={{ minWidth: "max-content" }}>
          {children}
        </div>
      </div>

      {hasOverflow && !atStart && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-background via-background/70 to-transparent"
          />
          <button
            type="button"
            aria-label={t("common.prev")}
            onClick={() => page(-1)}
            className={cn(arrowBase, "left-1")}
          >
            <ChevronLeft className="size-4 sm:size-5" aria-hidden />
          </button>
        </>
      )}

      {hasOverflow && !atEnd && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-background via-background/70 to-transparent"
          />
          <button
            type="button"
            aria-label={t("common.next")}
            onClick={() => page(1)}
            className={cn(arrowBase, "right-1")}
          >
            <ChevronRight className="size-4 sm:size-5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
