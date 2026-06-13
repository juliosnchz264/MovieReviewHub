"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ListGrid } from "@/features/lists/components/ListGrid";
import {
  useListsByUser,
  useCreateList,
  useDeleteList,
} from "@/features/lists/hooks/useLists";
import { ListFormDialog, type ListFormValues } from "@/features/lists/components/ListFormDialog";
import { useMyWatchlist } from "@/features/lists/hooks/useMyWatchlist";
import { useMyReviews } from "@/features/reviews/hooks/useReviews";
import { useMySeriesReviews } from "@/features/series/hooks/useSeriesReviews";
import { useMyFavorites } from "@/features/favorites/hooks/useFavorites";
import { useMySeriesFavorites } from "@/features/series/hooks/useSeriesFavorites";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { MediaKindToggle, type MediaKind } from "@/features/profile/components/MediaKindToggle";
import { useTranslate } from "@/hooks/useTranslate";
import type { PublicProfile } from "@/types/user";
import type { CustomList } from "@/types/list";
import type { ProfileTab } from "@/features/profile/components/ProfileTabs";

interface Props {
  profile: PublicProfile;
  tab: ProfileTab;
  isOwner: boolean;
}

export function ProfileTabPanels({ profile, tab, isOwner }: Props) {
  const t = useTranslate();

  if (tab === "overview") {
    return (
      <div className="space-y-10">
        <section aria-labelledby="bio-heading">
          <h2
            id="bio-heading"
            className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
          >
            {t("profile.about", { username: profile.username })}
          </h2>
          {profile.bio ? (
            <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-foreground/90">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {isOwner ? t("profile.noBioOwner") : t("profile.noBioOther")}
            </p>
          )}
        </section>
        <PublicListsSection profile={profile} isOwner={isOwner} />
      </div>
    );
  }

  if (tab === "lists") return <PublicListsSection profile={profile} isOwner={isOwner} />;
  if (tab === "reviews") return <ReviewsPanel isOwner={isOwner} />;
  if (tab === "ratings") return <RatingsPanel isOwner={isOwner} />;
  if (tab === "watchlist") return <WatchlistPanel isOwner={isOwner} />;
  if (tab === "favorites") return <FavoritesPanel isOwner={isOwner} />;

  return null;
}

function SectionHeader({
  title,
  toggle,
}: {
  title: string;
  toggle: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {toggle}
    </div>
  );
}

function PublicListsSection({ profile, isOwner }: { profile: PublicProfile; isOwner: boolean }) {
  const t = useTranslate();
  const listsQuery = useListsByUser(profile.id);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CustomList | null>(null);
  const createList = useCreateList();
  const deleteList = useDeleteList();

  async function handleCreate(values: ListFormValues) {
    const created = await createList.mutateAsync({
      title: values.title,
      description: values.description || null,
      visibility: values.visibility,
    });
    toast.success(t("lists.created", { title: created.title }));
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return;
    try {
      await deleteList.mutateAsync(pendingDelete.id);
      toast.success(t("lists.deleted", { title: pendingDelete.title }));
      // Refresca el listado del perfil (no solo /users/me/lists).
      listsQuery.refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("lists.deleteError");
      toast.error(msg);
    }
  }

  // Owner: el endpoint devuelve PUBLIC+PRIVATE+UNLISTED, asi que totalPublicLists del
  // perfil ya no refleja el conteo real. Tomamos totalElements del page.
  const count = isOwner
    ? listsQuery.data?.totalElements ?? 0
    : profile.totalPublicLists;

  return (
    <section aria-labelledby="lists-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 id="lists-heading" className="text-xl font-semibold tracking-tight">
            {isOwner ? t("profile.yourLists") : t("profile.publicLists")}
          </h2>
          {count > 0 && (
            <span className="text-sm text-muted-foreground">{count}</span>
          )}
        </div>
        {isOwner && (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="shadow-sm transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="mr-1.5 size-4" aria-hidden />
            {t("lists.createCta")}
          </Button>
        )}
      </div>

      {listsQuery.isLoading ? (
        <GridSkeleton />
      ) : listsQuery.data && listsQuery.data.content.length > 0 ? (
        <ListGrid
          lists={listsQuery.data.content}
          canManage={isOwner}
          onDelete={(list) => setPendingDelete(list)}
        />
      ) : (
        <Empty message={isOwner ? t("profile.noListsOwner") : t("profile.noListsOther")} />
      )}

      {isOwner && (
        <>
          <ListFormDialog
            open={showCreate}
            mode="create"
            onClose={() => setShowCreate(false)}
            onSubmit={handleCreate}
          />
          <ConfirmDialog
            open={pendingDelete !== null}
            title={t("lists.confirmDeleteTitle")}
            description={
              pendingDelete
                ? t("lists.confirmDeleteBody", { title: pendingDelete.title })
                : undefined
            }
            confirmLabel={t("lists.deleteAction")}
            destructive
            onConfirm={handleDeleteConfirm}
            onClose={() => setPendingDelete(null)}
          />
        </>
      )}
    </section>
  );
}

function ReviewsPanel({ isOwner }: { isOwner: boolean }) {
  const t = useTranslate();
  if (!isOwner) return <Empty message={t("profile.noReviewsOther")} />;
  return <OwnerReviewsList />;
}

function OwnerReviewsList() {
  const t = useTranslate();
  const { data, isLoading } = useMyReviews();
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (!data || data.content.length === 0) {
    return <Empty message={t("profile.noReviewsOwner")} />;
  }
  return (
    <ul className="space-y-3">
      {data.content.map((review) => (
        <li key={review.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <Link href={`/movies/${review.movieId}`} className="font-medium hover:underline">
                {review.movieTitle}
              </Link>
              <RatingStars value={review.rating} size="sm" readOnly />
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
          {review.comment && (
            <p className="text-sm leading-relaxed text-foreground/80">{review.comment}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function RatingsPanel({ isOwner }: { isOwner: boolean }) {
  const t = useTranslate();
  const [kind, setKind] = useState<MediaKind>("movie");

  const movieReviews = useMyReviews();
  const seriesReviews = useMySeriesReviews();

  if (!isOwner) return <Empty message={t("profile.noRatingsOther")} />;

  const movieCount = movieReviews.data?.totalElements ?? movieReviews.data?.content.length ?? 0;
  const seriesCount = seriesReviews.data?.totalElements ?? seriesReviews.data?.content.length ?? 0;

  return (
    <section className="space-y-4">
      <SectionHeader
        title={t("profile.sectionRatingsTitle")}
        toggle={
          <MediaKindToggle
            value={kind}
            onChange={setKind}
            movieCount={movieCount}
            seriesCount={seriesCount}
          />
        }
      />
      {kind === "movie" ? <MovieRatingsList /> : <SeriesRatingsList />}
    </section>
  );
}

function MovieRatingsList() {
  const t = useTranslate();
  const { data, isLoading } = useMyReviews();
  if (isLoading) return <ListSkeleton />;
  if (!data || data.content.length === 0)
    return <Empty message={t("profile.noRatingsOwnerMovies")} />;
  return (
    <ul className="space-y-3">
      {data.content.map((review) => (
        <li key={review.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <Link href={`/movies/${review.movieId}`} className="font-medium hover:underline">
                {review.movieTitle}
              </Link>
              <RatingStars value={review.rating} size="sm" readOnly />
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SeriesRatingsList() {
  const t = useTranslate();
  const { data, isLoading } = useMySeriesReviews();
  if (isLoading) return <ListSkeleton />;
  if (!data || data.content.length === 0)
    return <Empty message={t("profile.noRatingsOwnerSeries")} />;
  return (
    <ul className="space-y-3">
      {data.content.map((review) => (
        <li key={review.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <Link href={`/series/${review.seriesId}`} className="font-medium hover:underline">
                {review.seriesTitle}
              </Link>
              <RatingStars value={review.rating} size="sm" readOnly />
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function WatchlistPanel({ isOwner }: { isOwner: boolean }) {
  const t = useTranslate();
  const [kind, setKind] = useState<MediaKind>("movie");
  const wl = useMyWatchlist();

  if (!isOwner) return <Empty message={t("profile.noWatchlistOther")} />;

  return (
    <section className="space-y-4">
      <SectionHeader
        title={t("profile.sectionWatchlistTitle")}
        toggle={
          <MediaKindToggle
            value={kind}
            onChange={setKind}
            movieCount={wl.movieCount}
            seriesCount={wl.seriesCount}
          />
        }
      />
      {wl.isLoading ? (
        <GridSkeleton />
      ) : kind === "movie" ? (
        <MovieWatchlistGrid items={wl.movies.map((i) => i.movie!).filter(Boolean)} />
      ) : (
        <SeriesWatchlistGrid items={wl.series.map((i) => i.series!).filter(Boolean)} />
      )}
    </section>
  );
}

function FavoritesPanel({ isOwner }: { isOwner: boolean }) {
  const t = useTranslate();
  const [kind, setKind] = useState<MediaKind>("movie");
  const movieFav = useMyFavorites();
  const seriesFav = useMySeriesFavorites();

  if (!isOwner) return <Empty message={t("profile.noFavoritesOther")} />;

  const movieCount = movieFav.data?.totalElements ?? movieFav.data?.content.length ?? 0;
  const seriesCount = seriesFav.data?.totalElements ?? seriesFav.data?.content.length ?? 0;

  return (
    <section className="space-y-4">
      <SectionHeader
        title={t("profile.sectionFavoritesTitle")}
        toggle={
          <MediaKindToggle
            value={kind}
            onChange={setKind}
            movieCount={movieCount}
            seriesCount={seriesCount}
          />
        }
      />
      {kind === "movie" ? (
        movieFav.isLoading ? (
          <GridSkeleton />
        ) : movieFav.data && movieFav.data.content.length > 0 ? (
          <MovieWatchlistGrid items={movieFav.data.content} />
        ) : (
          <Empty message={t("profile.noFavoritesOwnerMovies")} />
        )
      ) : seriesFav.isLoading ? (
        <GridSkeleton />
      ) : seriesFav.data && seriesFav.data.content.length > 0 ? (
        <SeriesWatchlistGrid items={seriesFav.data.content} />
      ) : (
        <Empty message={t("profile.noFavoritesOwnerSeries")} />
      )}
    </section>
  );
}

function MovieWatchlistGrid({ items }: { items: { id: number; slug: string; title: string; imageUrl?: string | null }[] }) {
  const t = useTranslate();
  if (items.length === 0) return <Empty message={t("profile.noWatchlistOwnerMovies")} />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((movie) => (
        <Link
          key={movie.id}
          href={`/movies/${movie.slug}`}
          className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md"
        >
          <div className="relative aspect-2/3 bg-muted">
            {movie.imageUrl ? (
              <Image
                src={movie.imageUrl}
                alt={movie.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                —
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="line-clamp-1 text-sm font-medium">{movie.title}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SeriesWatchlistGrid({ items }: { items: { id: number; slug: string; title: string; imageUrl?: string | null }[] }) {
  const t = useTranslate();
  if (items.length === 0) return <Empty message={t("profile.noWatchlistOwnerSeries")} />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((series) => (
        <Link
          key={series.id}
          href={`/series/${series.id}`}
          className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md"
        >
          <div className="relative aspect-2/3 bg-muted">
            {series.imageUrl ? (
              <Image
                src={series.imageUrl}
                alt={series.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                —
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="line-clamp-1 text-sm font-medium">{series.title}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <Skeleton className="aspect-2/3 w-full" />
      <Skeleton className="aspect-2/3 w-full" />
      <Skeleton className="aspect-2/3 w-full" />
      <Skeleton className="aspect-2/3 w-full" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}
