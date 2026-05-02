import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-semibold tracking-tight">MovieReviewHub</h1>
      <p className="max-w-md text-center text-muted-foreground">
        A movie catalog with reviews. Sign in to write reviews and save favorites.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/movies">Browse movies</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/register">Register</Link>
        </Button>
      </div>
    </main>
  );
}
