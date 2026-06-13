"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMovieTrailer,
  useSeriesTrailer,
} from "@/features/trailers/hooks/useTrailer";
import { TrailerModal } from "@/features/trailers/components/TrailerModal";
import { useTranslate } from "@/hooks/useTranslate";
import type { MediaKind } from "@/types/cast";

interface Props {
  kind: MediaKind;
  id: number;
  title: string;
}

/**
 * Eager-fetches the trailer alongside the detail page (cached 1h server-side
 * + 1h client-side). Renders nothing while loading or when no trailer is
 * available, so the surrounding action bar doesn't reflow.
 */
export function TrailerButton({ kind, id, title }: Props) {
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const movieQuery = useMovieTrailer(kind === "movie" ? id : undefined);
  const seriesQuery = useSeriesTrailer(kind === "series" ? id : undefined);
  const query = kind === "movie" ? movieQuery : seriesQuery;

  const trailer = query.data;
  if (query.isLoading || !trailer) return null;

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="gap-1.5"
      >
        <PlayCircle className="size-4" aria-hidden />
        {t("trailer.watch")}
      </Button>

      <TrailerModal
        open={open}
        youtubeKey={trailer.youtubeKey}
        title={trailer.name || title}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
