"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { reviewSocialService } from "@/features/reviews/services/reviewSocial.service";

const HASH_PATTERN = /^#reply-(\d+)$/;

function parseHash(): number | null {
  if (typeof window === "undefined") return null;
  const match = HASH_PATTERN.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

function subscribeHashChange(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot(): number | null {
  return parseHash();
}

function getServerHashSnapshot(): number | null {
  return null;
}

/**
 * Resolves a `#reply-{id}` URL fragment on a review detail page into the
 * data the reply tree needs to auto-rehydrate the path leading to it:
 *
 *   - {@code targetReplyId}: the reply the user wants to land on.
 *   - {@code expandIds}: every ancestor in the chain that must be
 *     pre-expanded so the target actually renders.
 *
 * The ancestry is fetched once via the `/ancestry` endpoint (at most
 * {@code MAX_DEPTH + 1} server-side parent walks). Consumers feed
 * {@link AutoExpandContext} with the result; each {@code ReplyNode} reads
 * the context to decide whether to start expanded.
 *
 * Hash is read via {@link useSyncExternalStore} (no setState-in-effect):
 * SSR-safe — server snapshot is always {@code null}, client hydrates the
 * real fragment on mount.
 */
export function useReplyDeepLink() {
  const targetReplyId = useSyncExternalStore(
    subscribeHashChange,
    getHashSnapshot,
    getServerHashSnapshot
  );

  const ancestryQuery = useQuery({
    queryKey: ["review-ancestry", targetReplyId],
    queryFn: () => {
      if (targetReplyId == null) return Promise.resolve([]);
      return reviewSocialService.loadAncestry(targetReplyId);
    },
    enabled: targetReplyId != null,
    staleTime: 5 * 60_000,
  });

  const expandIds = useMemo(() => {
    const set = new Set<number>();
    const chain = ancestryQuery.data ?? [];
    // Chain is ordered root → ... → target. Every node except the target
    // itself needs to be expanded so the target actually renders.
    for (let i = 0; i < chain.length - 1; i++) {
      const node = chain[i];
      if (node) set.add(node.id);
    }
    return set;
  }, [ancestryQuery.data]);

  return {
    targetReplyId,
    expandIds,
    isLoading: ancestryQuery.isLoading,
    isError: ancestryQuery.isError,
  };
}
