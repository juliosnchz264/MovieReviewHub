"use client";

import { use } from "react";
import { Navbar } from "@/components/navbar";
import { ListGrid } from "@/features/lists/components/ListGrid";
import { useListsByUser } from "@/features/lists/hooks/useLists";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";

interface Props {
  params: Promise<{ username: string }>;
}

export default function UserPublicListsPage({ params }: Props) {
  const { username } = use(params);
  const profile = usePublicProfile(username);
  const userId = profile.data?.id;
  const { data, isLoading } = useListsByUser(userId);

  return (
    <>
      <Navbar />
      <main className="px-4 py-10">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight">Public lists</h1>
          {(profile.isLoading || isLoading) && (
            <p className="text-muted-foreground">Loading...</p>
          )}
          {data && <ListGrid lists={data.content} />}
        </div>
      </main>
    </>
  );
}
