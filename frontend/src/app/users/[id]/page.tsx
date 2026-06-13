import type { Metadata } from "next";
import { UserProfileView } from "./UserProfileView";
import { backendApiBase, fetchWithTimeout, safeJson } from "@/lib/server-api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

export const dynamic = "force-dynamic";

interface PublicProfileLite {
  id: number;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

async function fetchProfile(id: string): Promise<PublicProfileLite | null> {
  if (!Number.isFinite(Number(id))) return null;
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/users/${id}/profile`, {
    next: { revalidate: 300 },
  });
  return safeJson<PublicProfileLite>(res);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await fetchProfile(id);

  if (!profile) {
    return {
      title: "Profile not found",
      robots: { index: false },
    };
  }

  const name = profile.displayName ?? profile.username;
  const title = `${name} (@${profile.username})`;
  const description =
    profile.bio?.slice(0, 200) ??
    `${name}'s movie and series reviews on MovieReviewHub.`;
  const images = profile.avatarUrl ? [{ url: profile.avatarUrl, alt: name }] : [];
  const canonical = `${SITE_URL}/users/${profile.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonical,
      images,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: profile.avatarUrl ? [profile.avatarUrl] : [],
    },
  };
}

export default async function UserPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  return <UserProfileView userId={userId} />;
}
