export interface PublicProfile {
  id: number;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
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
}
