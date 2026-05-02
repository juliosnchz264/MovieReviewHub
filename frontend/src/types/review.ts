import type { PagedResponse } from "./movie";

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  userId: number;
  username: string;
  movieId: number;
  movieTitle: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequest {
  rating: number;
  comment?: string | null;
}

export interface MovieRatingStats {
  average: number;
  count: number;
}

export type ReviewPage = PagedResponse<Review>;
