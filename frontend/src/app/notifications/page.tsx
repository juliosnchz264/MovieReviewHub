"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { NotificationsListView } from "@/features/notifications/components/NotificationsListView";

export default function NotificationsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) router.replace("/login");
  }, [accessToken, router]);

  if (!accessToken) return null;
  return <NotificationsListView />;
}
