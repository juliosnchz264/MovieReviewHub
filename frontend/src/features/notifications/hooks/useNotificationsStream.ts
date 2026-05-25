import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import type { UnreadCount } from "@/types/notification";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

/**
 * Opens a long-lived SSE connection to /notifications/stream and reacts to
 * server-pushed events:
 *   - "notification"  → invalidate the list query so the dropdown refetches.
 *   - "unread-count"  → patch the cached unread count directly (no refetch).
 * Auth is via {@code ?access_token} query param because the browser
 * EventSource API cannot set headers; the backend allows the param only on
 * this single endpoint.
 *
 * Reconnect is handled by the browser natively. We tear down + reopen the
 * stream whenever the access token changes (login/logout/refresh).
 */
export function useNotificationsStream() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    const url = `${API_URL}/notifications/stream?access_token=${encodeURIComponent(
      accessToken
    )}`;
    const es = new EventSource(url, { withCredentials: true });

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

    return () => {
      es.removeEventListener("notification", onNotification);
      es.removeEventListener("unread-count", onUnreadCount);
      es.close();
    };
  }, [accessToken, qc]);
}
