"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/hooks/useFavorites";
import { useAuthStore } from "@/store/auth";

interface Props {
  movieId: number;
  variant?: "default" | "icon";
  className?: string;
}

export function FavoriteButton({ movieId, variant = "default", className }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: isFavorite, isLoading } = useIsFavorite(movieId);
  const toggle = useToggleFavorite(movieId);

  if (!accessToken) return null;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle.mutate(!!isFavorite);
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || toggle.isPending}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
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
      disabled={isLoading || toggle.isPending}
      className={className}
    >
      <Heart className={cn("size-4", isFavorite && "fill-current")} />
      {isFavorite ? "In favorites" : "Add to favorites"}
    </Button>
  );
}
