"use client";

import { Tv } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ComingSoon } from "@/components/coming-soon";
import { useTranslate } from "@/hooks/useTranslate";

export default function SeriesPage() {
  const t = useTranslate();
  return (
    <>
      <Navbar />
      <ComingSoon title={t("nav.series")} icon={<Tv className="size-7" />} />
    </>
  );
}
