export interface Movie {
  id: number;
  slug: string;
  publicId: string;
  title: string;
  description: string | null;
  genres: string[];
  imageUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovieRequest {
  title: string;
  description?: string | null;
  genres?: string[];
  imageUrl?: string | null;
  releaseDate?: string | null;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface MovieSearchParams {
  title?: string;
  genre?: string;
  page?: number;
  size?: number;
  sort?: string;
}
