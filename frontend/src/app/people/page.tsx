"use client";

import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/navbar";
import { PersonCard } from "@/features/people/components/PersonCard";
import { usePopularPeople, useSearchPeople } from "@/features/people/hooks/usePeople";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useIntersection } from "@/hooks/useIntersection";
import { useTranslate } from "@/hooks/useTranslate";

export default function PeoplePage() {
  const t = useTranslate();
  const [queryInput, setQueryInput] = useState("");
  const debouncedQuery = useDebouncedValue(queryInput, 350);
  const isSearching = debouncedQuery.trim().length > 0;

  const popular = usePopularPeople();
  const searchResults = useSearchPeople(debouncedQuery);

  const active = isSearching ? searchResults : popular;
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = active;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersection(sentinelRef, { rootMargin: "300px" });

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const people = data?.pages.flat() ?? [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-3 py-6 sm:px-4 sm:py-12">
        <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("nav.people")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("people.subtitle")}</p>
          </div>

          <input
            type="search"
            placeholder={t("people.searchPlaceholder")}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />

          {isLoading && <PeopleGridSkeleton count={12} />}
          {isError && <p className="text-destructive">{t("people.failedToLoad")}</p>}

          {!isLoading && people.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">{t("people.empty")}</p>
          )}

          {people.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {people.map((person) => (
                <PersonCard key={person.tmdbId} person={person} />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-10" />

          {isFetchingNextPage && <PeopleGridSkeleton count={5} />}

          {!hasNextPage && people.length > 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {t("people.endOfList")}
            </p>
          )}
        </div>
      </main>
    </>
  );
}

function PeopleGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="aspect-2/3 animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
