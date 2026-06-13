import { api } from "@/lib/api";
import type { Trailer } from "@/types/trailer";

/**
 * Backend returns 204 No Content when no usable trailer exists. Axios surfaces
 * that as `data === ""` (or undefined); normalize to `null` so the calling
 * hook can branch cleanly.
 */
function normalize(payload: unknown): Trailer | null {
  if (!payload || typeof payload !== "object") return null;
  return payload as Trailer;
}

export const trailerService = {
  async movieTrailer(movieId: number): Promise<Trailer | null> {
    const res = await api.get<Trailer | "">(`/movies/${movieId}/trailer`, {
      validateStatus: (s) => s === 200 || s === 204,
    });
    if (res.status === 204) return null;
    return normalize(res.data);
  },

  async seriesTrailer(seriesId: number): Promise<Trailer | null> {
    const res = await api.get<Trailer | "">(`/series/${seriesId}/trailer`, {
      validateStatus: (s) => s === 200 || s === 204,
    });
    if (res.status === 204) return null;
    return normalize(res.data);
  },
};
