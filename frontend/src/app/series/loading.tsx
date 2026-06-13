import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-2/3 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
