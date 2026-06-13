"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { NotificationsListView } from "@/features/notifications/components/NotificationsListView";

export default function NotificationsPage() {
  const { ready, authed } = useRequireAuth();
  if (!ready || !authed) return null;
  return <NotificationsListView />;
}
