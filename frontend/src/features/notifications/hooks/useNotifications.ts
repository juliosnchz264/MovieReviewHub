import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { notificationService } from "../services/notification.service";
import type {
  NotificationFilter,
  NotificationPage,
  UnreadCount,
} from "@/types/notification";

const POLL_INTERVAL_MS = 10_000;
const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

export function notificationsListKey(filter: NotificationFilter) {
  return ["notifications", "list", filter] as const;
}

export function useUnreadCount() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<UnreadCount>({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: notificationService.unreadCount,
    enabled: !!accessToken,
    staleTime: 5_000,
    // 10s active polling + immediate refetch when the tab regains focus. This
    // overrides the global default (refetchOnWindowFocus:false) for this hook
    // only, so the bell feels close to real-time without paying the cost of
    // SSE/WS infrastructure.
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      typeof document !== "undefined" && document.hidden ? false : POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useNotifications(filter: NotificationFilter = "all", size = 20) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useInfiniteQuery<
    NotificationPage,
    Error,
    { pages: NotificationPage[]; pageParams: number[] },
    ReturnType<typeof notificationsListKey>,
    number
  >({
    queryKey: notificationsListKey(filter),
    initialPageParam: 0,
    enabled: !!accessToken,
    queryFn: ({ pageParam }) => notificationService.list(pageParam, size, filter),
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    staleTime: 30_000,
  });
}

function patchPagesMarkRead(
  pages: NotificationPage[] | undefined,
  ids: Set<number>,
  readAt: string
): NotificationPage[] | undefined {
  if (!pages) return pages;
  return pages.map((p) => ({
    ...p,
    content: p.content.map((n) =>
      ids.has(n.id) && !n.read
        ? { ...n, read: true, seen: true, updatedAt: readAt }
        : n
    ),
  }));
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => notificationService.markRead(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const idSet = new Set(ids);
      const now = new Date().toISOString();

      const prevUnread = qc.getQueryData<UnreadCount>(UNREAD_COUNT_KEY);
      const prevAll = qc.getQueriesData<{ pages: NotificationPage[]; pageParams: number[] }>({
        queryKey: ["notifications", "list"],
      });

      if (prevUnread) {
        qc.setQueryData<UnreadCount>(UNREAD_COUNT_KEY, {
          count: Math.max(0, prevUnread.count - ids.length),
        });
      }
      for (const [key, data] of prevAll) {
        if (data) {
          qc.setQueryData(key, {
            ...data,
            pages: patchPagesMarkRead(data.pages, idSet, now) ?? [],
          });
        }
      }
      return { prevUnread, prevAll };
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      if (ctx.prevUnread) qc.setQueryData(UNREAD_COUNT_KEY, ctx.prevUnread);
      for (const [key, data] of ctx.prevAll) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const now = new Date().toISOString();
      const prevUnread = qc.getQueryData<UnreadCount>(UNREAD_COUNT_KEY);
      const prevAll = qc.getQueriesData<{ pages: NotificationPage[]; pageParams: number[] }>({
        queryKey: ["notifications", "list"],
      });

      qc.setQueryData<UnreadCount>(UNREAD_COUNT_KEY, { count: 0 });
      for (const [key, data] of prevAll) {
        if (data) {
          qc.setQueryData(key, {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              content: p.content.map((n) =>
                n.read ? n : { ...n, read: true, seen: true, updatedAt: now }
              ),
            })),
          });
        }
      }
      return { prevUnread, prevAll };
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      if (ctx.prevUnread) qc.setQueryData(UNREAD_COUNT_KEY, ctx.prevUnread);
      for (const [key, data] of ctx.prevAll) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    },
  });
}

/**
 * Fire-and-forget mark-seen. Does not invalidate list — only used to drop the
 * unread badge once the user has opened the bell, not to alter read state.
 */
export function useMarkSeen() {
  return useMutation({
    mutationFn: () => notificationService.markSeen(),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
