import type { Metadata } from "next";
import { ListDetailView } from "./ListDetailView";
import { backendApiBase, fetchWithTimeout, safeJson } from "@/lib/server-api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

export const dynamic = "force-dynamic";

interface ListLite {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
  itemCount: number;
  owner: { id: number; username: string };
}

async function fetchList(slug: string): Promise<ListLite | null> {
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/lists/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
  });
  return safeJson<ListLite>(res);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = await fetchList(slug);

  if (!list) {
    return {
      title: "List not found",
      robots: { index: false },
    };
  }

  const isPublic = list.visibility === "PUBLIC";
  const title = `${list.title} — list by @${list.owner.username}`;
  const description =
    list.description?.slice(0, 200) ??
    `A curated list of ${list.itemCount} ${list.itemCount === 1 ? "title" : "titles"} by @${list.owner.username}.`;
  const canonical = `${SITE_URL}/lists/${list.slug}`;

  return {
    title,
    description,
    robots: isPublic ? undefined : { index: false },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ListDetailView slug={slug} />;
}
