"use client";

import { use } from "react";
import { Navbar } from "@/components/navbar";
import { ListGrid } from "@/features/lists/components/ListGrid";
import { useListsByUser } from "@/features/lists/hooks/useLists";

interface Props {
  params: Promise<{ id: string }>;
}

export default function UserPublicListsPage({ params }: Props) {
  const { id } = use(params);
  const userId = Number(id);
  const { data, isLoading } = useListsByUser(userId);

  return (
    <>
      <Navbar />
      <main className="px-4 py-10">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight">Public lists</h1>
          {isLoading && <p className="text-muted-foreground">Loading...</p>}
          {data && <ListGrid lists={data.content} />}
        </div>
      </main>
    </>
  );
}
