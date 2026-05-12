"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/hooks/useFavorites";
import {
  useIsSeriesFavorite,
  useToggleSeriesFavorite,
} from "@/features/series/hooks/useSeriesFavorites";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import type { ListItemKind } from "@/types/list";

interface Props {
  kind: ListItemKind;
  targetId: number;
  variant?: "default" | "icon";
  className?: string;
}

export function MediaFavoriteButton({ kind, targetId, variant = "default", className }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return null;
  return kind === "MOVIE" ? (
    <MovieVariant movieId={targetId} variant={variant} className={className} />
  ) : (
    <SeriesVariant seriesId={targetId} variant={variant} className={className} />
  );
}

function MovieVariant({
  movieId,
  variant,
  className,
}: {
  movieId: number;
  variant: "default" | "icon";
  className?: string;
}) {
  const t = useTranslate();
  const { data: isFavorite, isLoading } = useIsFavorite(movieId);
  const toggle = useToggleFavorite(movieId);

  return (
    <FavoriteButtonView
      isFavorite={!!isFavorite}
      pending={isLoading || toggle.isPending}
      onToggle={() => toggle.mutate(!!isFavorite)}
      variant={variant}
      className={className}
      t={t}
    />
  );
}

function SeriesVariant({
  seriesId,
  variant,
  className,
}: {
  seriesId: number;
  variant: "default" | "icon";
  className?: string;
}) {
  const t = useTranslate();
  const { data: isFavorite, isLoading } = useIsSeriesFavorite(seriesId);
  const toggle = useToggleSeriesFavorite(seriesId);

  return (
    <FavoriteButtonView
      isFavorite={!!isFavorite}
      pending={isLoading || toggle.isPending}
      onToggle={() => toggle.mutate(!!isFavorite)}
      variant={variant}
      className={className}
      t={t}
    />
  );
}

function FavoriteButtonView({
  isFavorite,
  pending,
  onToggle,
  variant,
  className,
  t,
}: {
  isFavorite: boolean;
  pending: boolean;
  onToggle: () => void;
  variant: "default" | "icon";
  className?: string;
  t: (key: string) => string;
}) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={isFavorite ? t("toasts.favoriteRemoved") : t("actions.addToFavorites")}
        className={cn(
          "rounded-full bg-background/80 p-1.5 backdrop-blur transition hover:bg-background disabled:opacity-50",
          className
        )}
      >
        <Heart
          className={cn(
            "size-4 transition",
            isFavorite ? "fill-red-500 text-red-500" : "text-foreground/60"
          )}
        />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={isFavorite ? "default" : "outline"}
      onClick={handleClick}
      disabled={pending}
      className={className}
    >
      <Heart className={cn("size-4", isFavorite && "fill-current")} />
      {isFavorite ? t("actions.inFavorites") : t("actions.addToFavorites")}
    </Button>
  );
}
