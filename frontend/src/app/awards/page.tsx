"use client";

import { Trophy } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ComingSoon } from "@/components/coming-soon";
import { useTranslate } from "@/hooks/useTranslate";

export default function AwardsPage() {
  const t = useTranslate();
  return (
    <>
      <Navbar />
      <ComingSoon title={t("nav.awards")} icon={<Trophy className="size-7" />} />
    </>
  );
}
