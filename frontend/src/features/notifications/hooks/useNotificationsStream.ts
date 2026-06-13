import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { UnreadCount } from "@/types/notification";

const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

interface SseTokenResponse {
  token: string;
  expiresInSeconds: number;
}

/**
 * Opens a long-lived SSE connection to /notifications/stream.
 *
 * Auth flow:
 *   1. POST /notifications/stream-token using the access JWT (header).
 *   2. Open EventSource with the short-lived scope=sse token as ?token=…
 *      (EventSource cannot set headers, so a query param is the only path).
 *
 * The SSE token TTL is 60s and is scoped to this single endpoint, so
 * leaking it via Referer / proxy logs only buys a brief replay of the
 * notifications stream and nothing else.
 *
 * Reconnect is native to EventSource. We tear down + reopen on token change.
 */
export function useNotificationsStream() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    let es: EventSource | null = null;
    let cancelled = false;

    async function open() {
      try {
        const { data } = await api.post<SseTokenResponse>(
          "/notifications/stream-token",
        );
        if (cancelled) return;
        const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
        const url = `${base}/notifications/stream?token=${encodeURIComponent(data.token)}`;
        es = new EventSource(url, { withCredentials: true });

        const onNotification = () => {
          qc.invalidateQueries({ queryKey: ["notifications", "list"] });
          qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
        };
        const onUnreadCount = (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data) as UnreadCount;
            qc.setQueryData<UnreadCount>(UNREAD_COUNT_KEY, parsed);
          } catch {
            // Bad payload — fall through to next poll/invalidate.
          }
        };

        es.addEventListener("notification", onNotification);
        es.addEventListener("unread-count", onUnreadCount);
      } catch {
        // /stream-token failed (auth expired, network) — let the next render
        // retry once the access token cycle completes.
      }
    }

    open();

    return () => {
      cancelled = true;
      if (es) es.close();
    };
  }, [accessToken, qc]);
}
