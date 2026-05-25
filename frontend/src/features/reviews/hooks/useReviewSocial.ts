import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { reviewSocialService } from "@/features/reviews/services/reviewSocial.service";
import {
  findReplyInCaches,
  patchReplyInCaches,
  patchReviewInCaches,
} from "@/features/reviews/hooks/cachePatch";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import type {
  LikeState,
  ReplyLikeState,
  ReviewCard,
  ReviewKind,
  ReviewReply,
  ReviewReplyRequest,
  ReviewSort,
} from "@/types/review";
import type { PagedResponse } from "@/types/movie";

const SECTION_LIMIT = 3;

export function useReviewSection(
  kind: ReviewKind,
  targetId: number,
  sort: ReviewSort,
  limit = SECTION_LIMIT
) {
  return useQuery({
    queryKey: ["reviews", kind, "section", targetId, sort, limit],
    queryFn: () => reviewSocialService.section(kind, targetId, sort, limit),
    enabled: Number.isFinite(targetId) && targetId > 0,
    staleTime: 30_000,
  });
}

export function useReviewsFeed(
  kind: ReviewKind,
  targetId: number,
  sort: ReviewSort,
  size = 12
) {
  return useInfiniteQuery<
    PagedResponse<ReviewCard>,
    Error,
    { pages: PagedResponse<ReviewCard>[]; pageParams: number[] },
    [string, ReviewKind, string, number, ReviewSort],
    number
  >({
    queryKey: ["reviews", kind, "feed", targetId, sort],
    queryFn: ({ pageParam }) =>
      reviewSocialService.feed(kind, targetId, sort, pageParam, size),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: Number.isFinite(targetId) && targetId > 0,
    placeholderData: keepPreviousData,
  });
}

export function useReviewDetail(kind: ReviewKind, reviewId: number) {
  return useQuery({
    queryKey: ["reviews", kind, "detail", reviewId],
    queryFn: () => reviewSocialService.detail(kind, reviewId),
    enabled: Number.isFinite(reviewId) && reviewId > 0,
  });
}

// ---------- Like ----------

interface LikeVariables {
  wantLiked: boolean;
}

interface LikeContext {
  snapshot: Array<[QueryKey, unknown]>;
}

/**
 * Toggle a review's like. Reliability guarantees:
 *  - Caller passes the intended next state (`wantLiked`) instead of reading
 *    cache mid-mutation, so the network call cannot invert.
 *  - Snapshot/restore on error puts every affected cache entry back exactly.
 *  - Mutation `scope.id` serializes concurrent toggles on the same review.
 *  - `onSuccess` overwrites optimistic state with the server's authoritative
 *    `likedByMe` + `likeCount`, so the UI is never out of sync with the DB.
 *  - `onSettled` invalidates section + detail queries (rank may shift).
 */
export function useToggleReviewLike(kind: ReviewKind, reviewId: number) {
  const qc = useQueryClient();
  const t = useTranslate();

  return useMutation<LikeState, AxiosError, LikeVariables, LikeContext>({
    mutationFn: ({ wantLiked }) =>
      wantLiked
        ? reviewSocialService.like(kind, reviewId)
        : reviewSocialService.unlike(kind, reviewId),

    onMutate: async ({ wantLiked }) => {
      await qc.cancelQueries({ queryKey: ["reviews", kind] });
      const snapshot = qc.getQueriesData<unknown>({ queryKey: ["reviews", kind] });

      patchReviewInCaches(qc, kind, reviewId, (c) => {
        if (c.likedByMe === wantLiked) return c;
        return {
          ...c,
          likedByMe: wantLiked,
          likeCount: Math.max(0, c.likeCount + (wantLiked ? 1 : -1)),
        };
      });

      return { snapshot };
    },

    onError: (err, _v, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, value] of ctx.snapshot) {
          qc.setQueryData(key, value);
        }
      }
      const status = err?.response?.status;
      if (status === 401) {
        toast.error(t("reviews.signInToLike"));
      } else if (status === 400) {
        toast.error(t("reviews.cannotLikeOwn"));
      } else if (status === 404) {
        toast.error(t("reviews.detailNotFound"));
      } else {
        toast.error(t("reviews.likeFailed"));
      }
    },

    onSuccess: (state) => {
      // Authoritative server state — overwrites any prior optimistic guess.
      patchReviewInCaches(qc, kind, reviewId, (c) => ({
        ...c,
        likedByMe: state.likedByMe,
        likeCount: state.likeCount,
      }));
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["reviews", kind, "section"] });
      qc.invalidateQueries({ queryKey: ["reviews", kind, "detail", reviewId] });
    },

    scope: { id: `review-like-${kind}-${reviewId}` },
    retry: false,
  });
}

// ---------- Replies ----------

export function useReviewReplies(kind: ReviewKind, reviewId: number, size = 20) {
  return useInfiniteQuery<
    PagedResponse<ReviewReply>,
    Error,
    { pages: PagedResponse<ReviewReply>[]; pageParams: number[] },
    [string, ReviewKind, number],
    number
  >({
    queryKey: ["review-replies", kind, reviewId],
    queryFn: ({ pageParam }) =>
      reviewSocialService.listReplies(kind, reviewId, pageParam, size),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: Number.isFinite(reviewId) && reviewId > 0,
  });
}

function bumpReplyCount(qc: ReturnType<typeof useQueryClient>, kind: ReviewKind, reviewId: number, delta: number) {
  patchReviewInCaches(qc, kind, reviewId, (c) => ({
    ...c,
    replyCount: Math.max(0, c.replyCount + delta),
  }));
}

interface CreateReplyContext {
  tempId: number;
  parentReplyId: number | null;
  rootIdForCache: number | null;
  topLevelKey: QueryKey;
  childrenKey: QueryKey | null;
  threadKey: QueryKey | null;
}

type ReplyInfinite = { pages: PagedResponse<ReviewReply>[]; pageParams: unknown[] };

function bumpChildCountEverywhere(
  qc: ReturnType<typeof useQueryClient>,
  kind: ReviewKind,
  reviewId: number,
  parentReplyId: number,
  delta: number
): void {
  const mapper = (r: ReviewReply) =>
    r.id === parentReplyId
      ? { ...r, childCount: Math.max(0, r.childCount + delta) }
      : r;

  qc.setQueryData<ReplyInfinite>(
    ["review-replies", kind, reviewId],
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((p) => ({ ...p, content: p.content.map(mapper) })),
      };
    }
  );
  qc.setQueriesData<ReplyInfinite>(
    { queryKey: ["review-reply-children"] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((p) => ({ ...p, content: p.content.map(mapper) })),
      };
    }
  );
  qc.setQueriesData<ReviewReply[]>(
    { queryKey: ["review-thread"] },
    (old) => (Array.isArray(old) ? old.map(mapper) : old)
  );
}

/**
 * Optimistic reply create. Renders the reply instantly with a negative
 * temp id, then swaps it for the server-authoritative version on success.
 * Rolls back on error. For nested replies, inserts into the parent's
 * children cache and bumps the parent's childCount across every cache
 * that holds it.
 */
export function useCreateReply(kind: ReviewKind, reviewId: number) {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  return useMutation<ReviewReply, AxiosError, ReviewReplyRequest, CreateReplyContext>({
    mutationFn: (payload) =>
      reviewSocialService.createReply(kind, reviewId, payload),

    onMutate: async (payload) => {
      const parentReplyId = payload.parentReplyId ?? null;
      const topLevelKey: QueryKey = ["review-replies", kind, reviewId];
      const tempId = -(Date.now() * 1000 + Math.floor(Math.random() * 1000));

      let depth = 0;
      let rootIdForCache: number | null = null;
      let childrenKey: QueryKey | null = null;
      let threadKey: QueryKey | null = null;

      if (parentReplyId !== null) {
        const parent = findReplyInCaches(qc, kind, reviewId, parentReplyId);
        if (parent) {
          depth = parent.depth + 1;
          rootIdForCache = parent.rootReplyId ?? parent.id;
        }
        childrenKey = ["review-reply-children", parentReplyId];
        if (rootIdForCache !== null) {
          threadKey = ["review-thread", rootIdForCache];
        }
      }

      const cancelKey = parentReplyId === null ? topLevelKey : (childrenKey ?? topLevelKey);
      await qc.cancelQueries({ queryKey: cancelKey });

      const now = new Date().toISOString();
      const tempReply: ReviewReply = {
        id: tempId,
        userId: currentUser?.id ?? 0,
        username: currentUser?.username ?? "",
        userAvatarUrl: currentUser?.avatarUrl ?? null,
        body: payload.body,
        parentReplyId,
        rootReplyId: rootIdForCache,
        depth,
        childCount: 0,
        likeCount: 0,
        likedByMe: false,
        createdAt: now,
        updatedAt: now,
        canEdit: true,
        canDelete: true,
      };

      if (parentReplyId === null) {
        qc.setQueryData<ReplyInfinite>(topLevelKey, (old) => {
          if (!old || old.pages.length === 0) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              {
                ...first,
                content: [tempReply, ...first.content],
                totalElements: (first.totalElements ?? 0) + 1,
              },
              ...rest,
            ],
          };
        });
      } else if (childrenKey) {
        qc.setQueryData<ReplyInfinite>(childrenKey, (old) => {
          if (!old || old.pages.length === 0) return old;
          const lastIdx = old.pages.length - 1;
          return {
            ...old,
            pages: old.pages.map((p, i) =>
              i === lastIdx
                ? {
                    ...p,
                    content: [...p.content, tempReply],
                    totalElements: (p.totalElements ?? 0) + 1,
                  }
                : p
            ),
          };
        });
        bumpChildCountEverywhere(qc, kind, reviewId, parentReplyId, 1);
        if (threadKey) {
          qc.setQueryData<ReviewReply[]>(threadKey, (old) =>
            old ? [...old, tempReply] : old
          );
        }
      }

      bumpReplyCount(qc, kind, reviewId, 1);

      return { tempId, parentReplyId, rootIdForCache, topLevelKey, childrenKey, threadKey };
    },

    onError: (_err, _payload, ctx) => {
      if (!ctx) return;
      const filterOut = (r: ReviewReply) => r.id !== ctx.tempId;
      if (ctx.parentReplyId === null) {
        qc.setQueryData<ReplyInfinite>(ctx.topLevelKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              content: p.content.filter(filterOut),
              totalElements: Math.max(0, (p.totalElements ?? 0) - 1),
            })),
          };
        });
      } else {
        if (ctx.childrenKey) {
          qc.setQueryData<ReplyInfinite>(ctx.childrenKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((p) => ({
                ...p,
                content: p.content.filter(filterOut),
                totalElements: Math.max(0, (p.totalElements ?? 0) - 1),
              })),
            };
          });
        }
        if (ctx.threadKey) {
          qc.setQueryData<ReviewReply[]>(ctx.threadKey, (old) =>
            old ? old.filter(filterOut) : old
          );
        }
        bumpChildCountEverywhere(qc, kind, reviewId, ctx.parentReplyId, -1);
      }
      bumpReplyCount(qc, kind, reviewId, -1);
    },

    onSuccess: (created, _payload, ctx) => {
      if (ctx) {
        const swap = (r: ReviewReply) => (r.id === ctx.tempId ? created : r);
        if (ctx.parentReplyId === null) {
          qc.setQueryData<ReplyInfinite>(ctx.topLevelKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((p) => ({ ...p, content: p.content.map(swap) })),
            };
          });
        } else {
          if (ctx.childrenKey) {
            qc.setQueryData<ReplyInfinite>(ctx.childrenKey, (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((p) => ({ ...p, content: p.content.map(swap) })),
              };
            });
          }
          if (ctx.threadKey) {
            qc.setQueryData<ReviewReply[]>(ctx.threadKey, (old) =>
              old ? old.map(swap) : old
            );
          }
        }
      } else {
        // Defensive fallback: no optimistic context (e.g. anon user — shouldn't
        // reach here, mutation is auth-gated, but be safe).
        bumpReplyCount(qc, kind, reviewId, 1);
        if (created.parentReplyId == null) {
          qc.invalidateQueries({ queryKey: ["review-replies", kind, reviewId] });
        } else {
          qc.invalidateQueries({
            queryKey: ["review-reply-children", created.parentReplyId],
          });
          bumpChildCountEverywhere(qc, kind, reviewId, created.parentReplyId, 1);
        }
      }
      qc.invalidateQueries({ queryKey: ["reviews", kind, "section"] });
    },
  });
}

/**
 * Loads every active reply in the thread anchored at {@code rootReplyId},
 * including the root itself. Retained for deep-link rehydration (ancestry).
 * The live UI uses {@link useReplyChildren} for per-level lazy expansion.
 */
export function useReplyThread(rootReplyId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["review-thread", rootReplyId] as const,
    queryFn: () => reviewSocialService.loadThread(rootReplyId),
    enabled: enabled && Number.isFinite(rootReplyId) && rootReplyId > 0,
    staleTime: 30_000,
  });
}

/**
 * Direct children of a reply, paginated infinite query. Powers the
 * Reddit-style lazy expansion: each node fetches only its immediate
 * children when the user opens it. Children with their own
 * {@code childCount} drive deeper expansion via their own instance of
 * this hook.
 */
export function useReplyChildren(
  parentReplyId: number,
  enabled: boolean,
  size = 10
) {
  return useInfiniteQuery<
    PagedResponse<ReviewReply>,
    Error,
    { pages: PagedResponse<ReviewReply>[]; pageParams: number[] },
    [string, number],
    number
  >({
    queryKey: ["review-reply-children", parentReplyId],
    queryFn: ({ pageParam }) =>
      reviewSocialService.listChildren(parentReplyId, pageParam, size),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: enabled && Number.isFinite(parentReplyId) && parentReplyId > 0,
    staleTime: 30_000,
  });
}

interface DeleteReplyContext {
  parentReplyId: number | null;
  rootReplyId: number | null;
  foundInCache: boolean;
  snapshot: Array<[QueryKey, unknown]>;
}

/**
 * Optimistic reply delete. Removes the reply from every relevant cache
 * (top-level list, parent's children list, thread legacy cache) before
 * the network call lands, decrements the review's replyCount + parent's
 * childCount, and rolls back from snapshot on error.
 */
export function useDeleteReply(kind: ReviewKind, reviewId: number) {
  const qc = useQueryClient();
  return useMutation<void, AxiosError, number, DeleteReplyContext>({
    mutationFn: (id: number) => reviewSocialService.deleteReply(id),

    onMutate: async (id) => {
      const reply = findReplyInCaches(qc, kind, reviewId, id);
      const parentReplyId = reply?.parentReplyId ?? null;
      const rootReplyId = reply?.rootReplyId ?? null;
      const foundInCache = reply != null;

      await qc.cancelQueries({ queryKey: ["review-replies", kind, reviewId] });
      if (parentReplyId !== null) {
        await qc.cancelQueries({
          queryKey: ["review-reply-children", parentReplyId],
        });
      }

      const snapshot: Array<[QueryKey, unknown]> = [
        ...qc.getQueriesData<unknown>({ queryKey: ["review-replies", kind, reviewId] }),
        ...qc.getQueriesData<unknown>({ queryKey: ["review-reply-children"] }),
        ...qc.getQueriesData<unknown>({ queryKey: ["review-thread"] }),
        ...qc.getQueriesData<unknown>({ queryKey: ["reviews", kind] }),
      ];

      const removeFromInfinite = (
        old: { pages: PagedResponse<ReviewReply>[]; pageParams: unknown[] } | undefined
      ) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            content: p.content.filter((r) => r.id !== id),
            totalElements: Math.max(0, (p.totalElements ?? 0) - 1),
          })),
        };
      };

      if (parentReplyId === null) {
        qc.setQueryData(["review-replies", kind, reviewId], removeFromInfinite);
      } else {
        qc.setQueryData(
          ["review-reply-children", parentReplyId],
          removeFromInfinite
        );
        bumpChildCountEverywhere(qc, kind, reviewId, parentReplyId, -1);
      }
      if (rootReplyId != null) {
        qc.setQueryData<ReviewReply[]>(["review-thread", rootReplyId], (old) =>
          old ? old.filter((r) => r.id !== id) : old
        );
      } else if (parentReplyId === null) {
        // Root reply: also drop its own thread cache (deleted root has no
        // thread to display).
        qc.setQueryData(["review-thread", id], () => undefined);
      }
      bumpReplyCount(qc, kind, reviewId, -1);

      return { parentReplyId, rootReplyId, foundInCache, snapshot };
    },

    onError: (_err, _id, ctx) => {
      if (!ctx) return;
      for (const [key, value] of ctx.snapshot) {
        qc.setQueryData(key, value);
      }
    },

    onSuccess: (_data, _id, ctx) => {
      if (!ctx?.foundInCache) {
        // Reply wasn't in any cache (rare: page reloaded mid-action).
        // Broad-invalidate so server state surfaces.
        qc.invalidateQueries({ queryKey: ["review-replies", kind, reviewId] });
        qc.invalidateQueries({ queryKey: ["review-reply-children"] });
        qc.invalidateQueries({ queryKey: ["review-thread"] });
      }
      qc.invalidateQueries({ queryKey: ["reviews", kind, "section"] });
    },
  });
}

export function useUpdateReply(kind: ReviewKind, reviewId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReviewReplyRequest }) =>
      reviewSocialService.updateReply(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-replies", kind, reviewId] });
      qc.invalidateQueries({ queryKey: ["review-reply-children"] });
      qc.invalidateQueries({ queryKey: ["review-thread"] });
    },
  });
}

// ---------- Reply likes ----------

interface ReplyLikeVariables {
  wantLiked: boolean;
}

interface ReplyLikeContext {
  snapshot: Array<[QueryKey, unknown]>;
}

/**
 * Toggle a reply's like. Mirrors useToggleReviewLike: caller passes intended
 * next state, optimistic patch in caches, snapshot/restore on error, server
 * authoritative state on success, mutation scope to serialize concurrent
 * toggles on the same reply.
 */
export function useToggleReplyLike(
  kind: ReviewKind,
  reviewId: number,
  replyId: number
) {
  const qc = useQueryClient();
  const t = useTranslate();

  return useMutation<ReplyLikeState, AxiosError, ReplyLikeVariables, ReplyLikeContext>({
    mutationFn: ({ wantLiked }) =>
      wantLiked
        ? reviewSocialService.likeReply(replyId)
        : reviewSocialService.unlikeReply(replyId),

    onMutate: async ({ wantLiked }) => {
      await qc.cancelQueries({ queryKey: ["review-replies", kind, reviewId] });
      const snapshot = qc.getQueriesData<unknown>({
        queryKey: ["review-replies", kind, reviewId],
      });

      patchReplyInCaches(qc, kind, reviewId, replyId, (r) => {
        if (r.likedByMe === wantLiked) return r;
        return {
          ...r,
          likedByMe: wantLiked,
          likeCount: Math.max(0, r.likeCount + (wantLiked ? 1 : -1)),
        };
      });

      return { snapshot };
    },

    onError: (err, _v, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, value] of ctx.snapshot) {
          qc.setQueryData(key, value);
        }
      }
      const status = err?.response?.status;
      if (status === 401) {
        toast.error(t("reviews.signInToLike"));
      } else if (status === 400) {
        toast.error(t("reviews.cannotLikeOwn"));
      } else if (status === 404) {
        toast.error(t("reviews.replyDeleteConfirm"));
      } else {
        toast.error(t("reviews.likeFailed"));
      }
    },

    onSuccess: (state) => {
      // Server is the source of truth — overwrite any prior optimistic guess.
      patchReplyInCaches(qc, kind, reviewId, replyId, (r) => ({
        ...r,
        likedByMe: state.likedByMe,
        likeCount: state.likeCount,
      }));
    },

    scope: { id: `reply-like-${replyId}` },
    retry: false,
  });
}
