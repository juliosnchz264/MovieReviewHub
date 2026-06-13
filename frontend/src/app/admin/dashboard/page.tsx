"use client";

import { Users, Film, Tv, MessageSquare, Heart, Shield, UserX, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/features/admin/hooks/useAdmin";
import { useTranslate } from "@/hooks/useTranslate";

export default function AdminDashboardPage() {
  const t = useTranslate();
  const { data: stats, isLoading, isError } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }
  if (isError || !stats) return <p className="text-destructive">{t("admin.dashboard.loadFailed")}</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={t("admin.dashboard.totalUsers")} value={stats.totalUsers} icon={Users} />
      <StatCard label={t("admin.dashboard.activeUsers")} value={stats.activeUsers} icon={UserCheck} />
      <StatCard label={t("admin.dashboard.bannedUsers")} value={stats.bannedUsers} icon={UserX} />
      <StatCard label={t("admin.dashboard.admins")} value={stats.admins} icon={Shield} />
      <StatCard label={t("admin.dashboard.movies")} value={stats.totalMovies} icon={Film} />
      <StatCard label={t("admin.dashboard.series")} value={stats.totalSeries} icon={Tv} />
      <StatCard label={t("admin.dashboard.movieReviews")} value={stats.totalReviews} icon={MessageSquare} />
      <StatCard label={t("admin.dashboard.seriesReviews")} value={stats.totalSeriesReviews} icon={MessageSquare} />
      <StatCard label={t("admin.dashboard.movieFavorites")} value={stats.totalFavorites} icon={Heart} />
      <StatCard label={t("admin.dashboard.seriesFavorites")} value={stats.totalSeriesFavorites} icon={Heart} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | undefined | null;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const safe = value ?? 0;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{safe.toLocaleString()}</p>
    </div>
  );
}
