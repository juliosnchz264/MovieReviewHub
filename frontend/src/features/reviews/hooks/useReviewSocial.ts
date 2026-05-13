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
import { patchReviewInCaches } from "@/features/reviews/hooks/cachePatch";
import { useTranslate } from "@/hooks/useTranslate";
import type {
  LikeState,
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

export function useCreateReply(kind: ReviewKind, reviewId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewReplyRequest) =>
      reviewSocialService.createReply(kind, reviewId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-replies", kind, reviewId] });
      bumpReplyCount(qc, kind, reviewId, 1);
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
    },
  });
}

export function useDeleteReply(kind: ReviewKind, reviewId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reviewSocialService.deleteReply(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-replies", kind, reviewId] });
      bumpReplyCount(qc, kind, reviewId, -1);
      qc.invalidateQueries({ queryKey: ["reviews", kind, "section"] });
    },
  });
}
