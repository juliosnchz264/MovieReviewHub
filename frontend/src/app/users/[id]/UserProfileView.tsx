"use client";

import { notFound, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileHero } from "@/features/profile/components/ProfileHero";
import { ProfileStats } from "@/features/profile/components/ProfileStats";
import {
  ProfileTabs,
  getVisibleTabs,
  type ProfileTab,
} from "@/features/profile/components/ProfileTabs";
import { ProfileTabPanels } from "@/features/profile/components/ProfileTabPanels";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { useAuthStore } from "@/store/auth";

export function UserProfileView({ userId }: { userId: number }) {
  const validId = Number.isFinite(userId) && userId > 0;

  const search = useSearchParams();
  const viewerId = useAuthStore((s) => s.user?.id ?? null);
  const isOwner = viewerId === userId;

  const visibleTabs = getVisibleTabs(isOwner);
  const rawTab = (search.get("tab") ?? "overview") as ProfileTab;
  const activeTab: ProfileTab = visibleTabs.includes(rawTab) ? rawTab : "overview";

  const profileQuery = usePublicProfile(validId ? userId : undefined);

  if (!validId || profileQuery.isError) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="pb-16">
        {profileQuery.isLoading || !profileQuery.data ? (
          <ProfileSkeleton />
        ) : (
          <>
            <ProfileHero profile={profileQuery.data} isOwner={isOwner} />
            <ProfileTabs active={activeTab} isOwner={isOwner} />
            <div className="mx-auto mt-8 w-full max-w-5xl space-y-10 px-4">
              {activeTab === "overview" && <ProfileStats profile={profileQuery.data} />}
              <ProfileTabPanels
                profile={profileQuery.data}
                tab={activeTab}
                isOwner={isOwner}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <Skeleton className="h-44 w-full sm:h-60 lg:h-72" />
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="-mt-12 flex flex-col items-center gap-3 sm:-mt-16 sm:flex-row sm:items-end">
          <Skeleton className="size-24 rounded-full sm:size-32" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </>
  );
}
