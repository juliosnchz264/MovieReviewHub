import Link from "next/link";
import { ReactNode } from "react";
import { AuthHero } from "./_components/auth-hero";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero />

      <section className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between px-6 py-4 lg:px-10">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-foreground hover:opacity-80"
          >
            MovieReviewHub
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Inicio
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-8 lg:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
