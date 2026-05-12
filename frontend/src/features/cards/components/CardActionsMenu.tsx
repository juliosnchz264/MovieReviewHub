"use client";

import { useState } from "react";
import {
  Bookmark,
  Heart,
  ListOrdered,
  MinusCircle,
  MoreVertical,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { ClientPortal } from "@/components/ui/client-portal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { ListPickerSection } from "@/features/lists/components/ListPickerSection";
import { ListFormDialog, type ListFormValues } from "@/features/lists/components/ListFormDialog";
import { useCreateList, useInMyLists } from "@/features/lists/hooks/useLists";
import { useDefaultList, useIsInDefaultList } from "@/features/lists/hooks/useDefaultList";
import { listsService } from "@/features/lists/services/lists.service";
import {
  useIsFavorite,
  useToggleFavorite,
} from "@/features/favorites/hooks/useFavorites";
import {
  useIsSeriesFavorite,
  useToggleSeriesFavorite,
} from "@/features/series/hooks/useSeriesFavorites";
import {
  useMyMovieReview,
  useRemoveMovieRating,
  useUpsertMovieRating,
} from "@/features/reviews/hooks/useReviews";
import {
  useMySeriesReview,
  useRemoveSeriesRating,
  useUpsertSeriesRating,
} from "@/features/series/hooks/useSeriesReviews";
import type { ListItemKind } from "@/types/list";

interface Props {
  kind: ListItemKind;
  targetId: number;
  className?: string;
}

export function CardActionsMenu({ kind, targetId, className }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const t = useTranslate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [ratingExpanded, setRatingExpanded] = useState(false);

  const createList = useCreateList();
  const inMyLists = useInMyLists(kind, targetId);

  if (!accessToken) return null;

  async function handleCreate(values: ListFormValues) {
    const created = await createList.mutateAsync({
      title: values.title,
      description: values.description || null,
      visibility: values.visibility,
    });
    await listsService.addItem(created.id, { kind, targetId });
    toast.success(t("toasts.addedToList", { title: created.title }));
  }

  const inAnyList = (inMyLists.data ?? []).length > 0;

  return (
    <>
      <div className={cn("relative", className)}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("actions.moreActions")}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={cn(
                "rounded-full bg-background/90 p-1.5 transition hover:bg-background"
              )}
            >
              <MoreVertical
                className={cn(
                  "size-4",
                  inAnyList ? "text-primary" : "text-foreground/60"
                )}
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-60"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setShowPicker(true);
              }}
            >
              <ListOrdered className="size-4" />
              <span>{t("actions.addToList")}</span>
            </DropdownMenuItem>

            <FavoriteRow kind={kind} targetId={targetId} />
            <WatchlistRow kind={kind} targetId={targetId} />

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setRatingExpanded((v) => !v);
              }}
            >
              <Star className="size-4" />
              <span>{t("actions.yourRating")}</span>
            </DropdownMenuItem>

            {ratingExpanded && (
              <RatingPanel kind={kind} targetId={targetId} />
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showPicker && (
        <ListPickerOverlay
          kind={kind}
          targetId={targetId}
          onClose={() => setShowPicker(false)}
          onCreateClick={() => {
            setShowPicker(false);
            setShowCreate(true);
          }}
        />
      )}

      <ListFormDialog
        open={showCreate}
        mode="create"
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}

function FavoriteRow({ kind, targetId }: { kind: ListItemKind; targetId: number }) {
  if (kind === "MOVIE") {
    return <MovieFavoriteRow movieId={targetId} />;
  }
  return <SeriesFavoriteRow seriesId={targetId} />;
}

function MovieFavoriteRow({ movieId }: { movieId: number }) {
  const t = useTranslate();
  const { data: isFavorite } = useIsFavorite(movieId);
  const toggle = useToggleFavorite(movieId);
  return (
    <DropdownMenuItem
      disabled={toggle.isPending}
      onSelect={(e) => {
        e.preventDefault();
        toggle.mutate(!!isFavorite);
      }}
    >
      <Heart
        className={cn(
          "size-4",
          isFavorite ? "fill-red-500 text-red-500" : "text-foreground/60"
        )}
      />
      <span>{t("actions.favorite")}</span>
    </DropdownMenuItem>
  );
}

function SeriesFavoriteRow({ seriesId }: { seriesId: number }) {
  const t = useTranslate();
  const { data: isFavorite } = useIsSeriesFavorite(seriesId);
  const toggle = useToggleSeriesFavorite(seriesId);
  return (
    <DropdownMenuItem
      disabled={toggle.isPending}
      onSelect={(e) => {
        e.preventDefault();
        toggle.mutate(!!isFavorite);
      }}
    >
      <Heart
        className={cn(
          "size-4",
          isFavorite ? "fill-red-500 text-red-500" : "text-foreground/60"
        )}
      />
      <span>{t("actions.favorite")}</span>
    </DropdownMenuItem>
  );
}

function WatchlistRow({ kind, targetId }: { kind: ListItemKind; targetId: number }) {
  const t = useTranslate();
  const { list, toggle } = useDefaultList("WATCHLIST");
  const isIn = useIsInDefaultList("WATCHLIST", kind, targetId);

  return (
    <DropdownMenuItem
      disabled={!list || toggle.isPending}
      onSelect={(e) => {
        e.preventDefault();
        if (!list) return;
        toggle.mutate({ kind, targetId, isIn });
      }}
    >
      <Bookmark
        className={cn(
          "size-4",
          isIn ? "fill-primary text-primary" : "text-foreground/60"
        )}
      />
      <span>{t("actions.watchlist")}</span>
    </DropdownMenuItem>
  );
}

function RatingPanel({ kind, targetId }: { kind: ListItemKind; targetId: number }) {
  if (kind === "MOVIE") return <MovieRatingPanel movieId={targetId} />;
  return <SeriesRatingPanel seriesId={targetId} />;
}

function MovieRatingPanel({ movieId }: { movieId: number }) {
  const { data: myReview, isLoading } = useMyMovieReview(movieId);
  const upsert = useUpsertMovieRating(movieId);
  const remove = useRemoveMovieRating(movieId);

  return (
    <RatingPanelView
      isLoading={isLoading}
      currentRating={myReview?.rating ?? 0}
      hasReview={!!myReview}
      pending={upsert.isPending || remove.isPending}
      onSelect={(v) => upsert.mutate(v)}
      onRemove={() => remove.mutate()}
    />
  );
}

function SeriesRatingPanel({ seriesId }: { seriesId: number }) {
  const { data: myReview, isLoading } = useMySeriesReview(seriesId);
  const upsert = useUpsertSeriesRating(seriesId);
  const remove = useRemoveSeriesRating(seriesId);

  return (
    <RatingPanelView
      isLoading={isLoading}
      currentRating={myReview?.rating ?? 0}
      hasReview={!!myReview}
      pending={upsert.isPending || remove.isPending}
      onSelect={(v) => upsert.mutate(v)}
      onRemove={() => remove.mutate()}
    />
  );
}

function RatingPanelView({
  isLoading,
  currentRating,
  hasReview,
  pending,
  onSelect,
  onRemove,
}: {
  isLoading: boolean;
  currentRating: number;
  hasReview: boolean;
  pending: boolean;
  onSelect: (value: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslate();
  return (
    <div
      className={cn(
        "px-2 pb-2",
        "animate-in fade-in-0 slide-in-from-top-1"
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={!hasReview || pending}
        onClick={onRemove}
        className="mb-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground/80 transition hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <MinusCircle className="size-4" />
        <span>{t("actions.removeRating")}</span>
      </button>
      <div className="px-2 py-1">
        {isLoading ? (
          <Skeleton className="h-6 w-32" />
        ) : (
          <RatingStars
            value={currentRating}
            onChange={onSelect}
            size="lg"
            allowHalf
          />
        )}
      </div>
    </div>
  );
}

function ListPickerOverlay({
  kind,
  targetId,
  onClose,
  onCreateClick,
}: {
  kind: ListItemKind;
  targetId: number;
  onClose: () => void;
  onCreateClick: () => void;
}) {
  return (
    <ClientPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-60 isolate flex items-start justify-center bg-black/40 px-4 pt-24 sm:pt-32"
        onClick={onClose}
      >
        <div
          className={cn(
            "w-full max-w-sm overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <ListPickerSection
            kind={kind}
            targetId={targetId}
            onCreateClick={onCreateClick}
          />
        </div>
      </div>
    </ClientPortal>
  );
}
