"use client";

import { Users, Film, Tv, MessageSquare, Heart, Shield, UserX, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/features/admin/hooks/useAdmin";

export default function AdminDashboardPage() {
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
  if (isError || !stats) return <p className="text-destructive">Failed to load stats</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total users" value={stats.totalUsers} icon={Users} />
      <StatCard label="Active users" value={stats.activeUsers} icon={UserCheck} />
      <StatCard label="Banned users" value={stats.bannedUsers} icon={UserX} />
      <StatCard label="Admins" value={stats.admins} icon={Shield} />
      <StatCard label="Movies" value={stats.totalMovies} icon={Film} />
      <StatCard label="Series" value={stats.totalSeries} icon={Tv} />
      <StatCard label="Movie reviews" value={stats.totalReviews} icon={MessageSquare} />
      <StatCard label="Series reviews" value={stats.totalSeriesReviews} icon={MessageSquare} />
      <StatCard label="Movie favorites" value={stats.totalFavorites} icon={Heart} />
      <StatCard label="Series favorites" value={stats.totalSeriesFavorites} icon={Heart} />
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
