"use client";

import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

interface Props {
  title: string;
  icon?: React.ReactNode;
}

export function ComingSoon({ title, icon }: Props) {
  const t = useTranslate();

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-4 grid size-16 place-items-center rounded-full bg-secondary text-secondary-foreground">
          {icon ?? <Construction className="size-7" />}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("common.comingSoon")}</p>
        <p className="mt-4 leading-relaxed text-foreground/80">
          {t("common.comingSoonDesc")}
        </p>
        <Button asChild className="mt-6">
          <Link href="/movies">{t("common.backToMovies")}</Link>
        </Button>
      </div>
    </main>
  );
}
