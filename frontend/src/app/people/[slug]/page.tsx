import type { Metadata } from "next";
import { PersonDetailView } from "./PersonDetailView";
import { backendApiBase, fetchWithTimeout, safeJson } from "@/lib/server-api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

export const dynamic = "force-dynamic";

interface PersonLite {
  tmdbId: number;
  slug: string;
  name: string;
  biography?: string | null;
  profileUrl?: string | null;
  knownForDepartment?: string | null;
}

// `key` is the canonical slug; backend also resolves the legacy numeric tmdbId.
async function fetchPerson(key: string): Promise<PersonLite | null> {
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/people/${encodeURIComponent(key)}`, {
    next: { revalidate: 300 },
  });
  return safeJson<PersonLite>(res);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const person = await fetchPerson(slug);

  if (!person) {
    return {
      title: "Person not found",
      robots: { index: false },
    };
  }

  const description =
    person.biography?.slice(0, 200) ??
    `${person.name}${person.knownForDepartment ? ` — ${person.knownForDepartment}` : ""}. Filmography on MovieReviewHub.`;
  const images = person.profileUrl ? [{ url: person.profileUrl, alt: person.name }] : [];
  const canonical = `${SITE_URL}/people/${person.slug}`;

  return {
    title: person.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: person.name,
      description,
      type: "profile",
      url: canonical,
      images,
    },
    twitter: {
      card: "summary",
      title: person.name,
      description,
      images: person.profileUrl ? [person.profileUrl] : [],
    },
  };
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PersonDetailView personKey={slug} />;
}
