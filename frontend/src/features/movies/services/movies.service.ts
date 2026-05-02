import { api } from "@/lib/api";
import type {
  Movie,
  MovieRequest,
  MovieSearchParams,
  PagedResponse,
} from "@/types/movie";

export const moviesService = {
  async search(params: MovieSearchParams): Promise<PagedResponse<Movie>> {
    const { data } = await api.get<PagedResponse<Movie>>("/movies", { params });
    return data;
  },

  async findById(id: number): Promise<Movie> {
    const { data } = await api.get<Movie>(`/movies/${id}`);
    return data;
  },

  async create(payload: MovieRequest): Promise<Movie> {
    const { data } = await api.post<Movie>("/movies", payload);
    return data;
  },

  async update(id: number, payload: MovieRequest): Promise<Movie> {
    const { data } = await api.put<Movie>(`/movies/${id}`, payload);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/movies/${id}`);
  },
};
