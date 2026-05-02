"use client";

import { Users } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ComingSoon } from "@/components/coming-soon";
import { useTranslate } from "@/hooks/useTranslate";

export default function PeoplePage() {
  const t = useTranslate();
  return (
    <>
      <Navbar />
      <ComingSoon title={t("nav.people")} icon={<Users className="size-7" />} />
    </>
  );
}
