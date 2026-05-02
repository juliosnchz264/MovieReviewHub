"use client";

import { Users, Film, MessageSquare, Heart, Shield, UserX, UserCheck } from "lucide-react";
import { useAdminStats } from "@/features/admin/hooks/useAdmin";

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError } = useAdminStats();

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (isError || !stats) return <p className="text-destructive">Failed to load stats</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total users" value={stats.totalUsers} icon={Users} />
      <StatCard label="Active users" value={stats.activeUsers} icon={UserCheck} />
      <StatCard label="Banned users" value={stats.bannedUsers} icon={UserX} />
      <StatCard label="Admins" value={stats.admins} icon={Shield} />
      <StatCard label="Movies" value={stats.totalMovies} icon={Film} />
      <StatCard label="Reviews" value={stats.totalReviews} icon={MessageSquare} />
      <StatCard label="Favorites" value={stats.totalFavorites} icon={Heart} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
    </div>
  );
}
