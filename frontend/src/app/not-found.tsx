import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium tracking-widest text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        That link doesn&apos;t lead anywhere. Try the catalog or head home.
      </p>
      <div className="flex gap-2">
        <Link href="/">
          <Button>Go home</Button>
        </Link>
        <Link href="/movies">
          <Button variant="outline">Browse movies</Button>
        </Link>
      </div>
    </main>
  );
}
