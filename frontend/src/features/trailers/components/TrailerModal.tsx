"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { ClientPortal } from "@/components/ui/client-portal";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";

interface Props {
  open: boolean;
  youtubeKey: string;
  title: string;
  onClose: () => void;
}

/**
 * Embeds a YouTube trailer in an accessible modal.
 *
 * Security:
 *   - Uses youtube-nocookie.com (privacy-enhanced mode), no third-party
 *     tracking cookies on first render.
 *   - The `youtubeKey` is regex-validated server-side before being returned
 *     by the backend, so this component embeds it unconditionally.
 *   - `sandbox` is intentionally permissive enough for the embed to play
 *     (autoplay + presentation + same-origin) but blocks top-level navigation
 *     and form submission.
 */
export function TrailerModal({ open, youtubeKey, title, onClose }: Props) {
  const t = useTranslate();
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setErrored(false);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Restore focus to the trigger on close — handled by the caller through
    // ref preservation; here we just move focus to the dialog close so screen
    // readers announce the dialog landing.
    const timer = setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    youtubeKey
  )}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <ClientPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trailer-title"
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-3 py-6 sm:px-6"
        onClick={onClose}
      >
        <div
          className={cn(
            "relative w-full max-w-4xl overflow-hidden rounded-xl bg-card shadow-2xl",
            "animate-in fade-in-0 zoom-in-95"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <h2
              id="trailer-title"
              className="line-clamp-1 text-sm font-medium"
            >
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("trailer.close")}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="relative aspect-video w-full bg-black">
            {!loaded && !errored && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70">
                <Loader2 className="size-6 animate-spin" aria-hidden />
                <span className="sr-only">{t("trailer.loading")}</span>
              </div>
            )}
            {errored ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-sm text-white/80">
                {t("trailer.error")}
              </div>
            ) : (
              <iframe
                src={src}
                title={title}
                className="absolute inset-0 size-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setLoaded(true)}
                onError={() => setErrored(true)}
              />
            )}
          </div>
        </div>
      </div>
    </ClientPortal>
  );
}
