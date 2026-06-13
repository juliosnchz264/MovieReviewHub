import { api } from "@/lib/api";
import type { CastMember } from "@/types/cast";

export const castService = {
  async movieCast(movieId: number, limit = 10): Promise<CastMember[]> {
    const { data } = await api.get<CastMember[]>(`/movies/${movieId}/cast`, {
      params: { limit },
    });
    return data;
  },

  async seriesCast(seriesId: number, limit = 10): Promise<CastMember[]> {
    const { data } = await api.get<CastMember[]>(`/series/${seriesId}/cast`, {
      params: { limit },
    });
    return data;
  },
};
