import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Skeleton className="h-9 w-24" />
        <div className="grid gap-5 sm:gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr]">
          <Skeleton className="mx-auto aspect-2/3 w-40 rounded-xl sm:w-52 md:mx-0 md:w-full" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    </main>
  );
}
