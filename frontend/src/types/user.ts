export interface SocialLinks {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
}

export interface PublicProfile {
  id: number;
  username: string;
  handle: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  themeColor: string | null;
  social: SocialLinks;
  memberSince: string;
  averageMovieScore: number | null;
  averageTvScore: number | null;
  totalMovieReviews: number;
  totalTvReviews: number;
  totalPublicLists: number;
}

export interface UpdateProfileRequest {
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  handle?: string | null;
  themeColor?: string | null;
  socialFacebook?: string | null;
  socialInstagram?: string | null;
  socialTwitter?: string | null;
  socialTiktok?: string | null;
}

export interface AccountSettings {
  defaultLanguage: string | null;
  fallbackLanguage: string | null;
  country: string | null;
  timezone: string | null;
  autodetectTimezone: boolean;
}

export interface UpdateAccountSettingsRequest {
  defaultLanguage?: string | null;
  fallbackLanguage?: string | null;
  country?: string | null;
  timezone?: string | null;
  autodetectTimezone?: boolean;
}

export const THEME_COLORS = [
  "default",
  "rose",
  "violet",
  "indigo",
  "blue",
  "teal",
  "green",
  "amber",
  "orange",
  "red",
  "slate",
] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];
