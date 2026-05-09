"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { ListGrid } from "@/features/lists/components/ListGrid";
import { usePublicListsByUser } from "@/features/lists/hooks/useLists";
import { ProfileHero } from "@/features/profile/components/ProfileHero";
import { ProfileStats } from "@/features/profile/components/ProfileStats";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { useAuthStore } from "@/store/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default function UserPublicProfilePage({ params }: Props) {
  const { id } = use(params);
  const userId = Number(id);
  const validId = Number.isFinite(userId) && userId > 0;

  const viewerId = useAuthStore((s) => s.user?.id ?? null);
  const isOwner = viewerId === userId;

  const profileQuery = usePublicProfile(validId ? userId : undefined);
  const listsQuery = usePublicListsByUser(validId ? userId : undefined);

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

            <div className="mx-auto mt-8 w-full max-w-5xl space-y-10 px-4">
              <ProfileStats profile={profileQuery.data} />

              <section aria-labelledby="bio-heading">
                <h2
                  id="bio-heading"
                  className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Sobre @{profileQuery.data.username}
                </h2>
                {profileQuery.data.bio ? (
                  <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-foreground/90">
                    {profileQuery.data.bio}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isOwner
                      ? "Aún no has añadido una descripción. Edita tu perfil para presentarte."
                      : "Este usuario aún no ha añadido una descripción."}
                  </p>
                )}
              </section>

              <section aria-labelledby="lists-heading" className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 id="lists-heading" className="text-xl font-semibold tracking-tight">
                    Listas públicas
                  </h2>
                  {profileQuery.data.totalPublicLists > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {profileQuery.data.totalPublicLists}
                    </span>
                  )}
                </div>

                {listsQuery.isLoading ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-36 w-full" />
                    <Skeleton className="h-36 w-full" />
                    <Skeleton className="h-36 w-full" />
                  </div>
                ) : listsQuery.data && listsQuery.data.content.length > 0 ? (
                  <ListGrid lists={listsQuery.data.content} />
                ) : (
                  <p className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                    {isOwner
                      ? "Aún no tienes listas públicas. Cambia la visibilidad de alguna lista a 'Pública' para que aparezca aquí."
                      : "Este usuario aún no tiene listas públicas."}
                  </p>
                )}
              </section>
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
