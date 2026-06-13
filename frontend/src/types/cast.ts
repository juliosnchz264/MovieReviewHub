export interface CastMember {
  tmdbPersonId: number;
  name: string;
  character: string;
  profileUrl: string | null;
  order: number | null;
}

export type MediaKind = "movie" | "series";
