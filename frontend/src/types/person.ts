export interface Person {
  tmdbId: number;
  slug: string;
  name: string;
  profileUrl: string | null;
  knownForDepartment: string | null;
}

export interface PersonCredit {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl: string | null;
  character: string | null;
  job: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
}

export interface PersonDetail {
  tmdbId: number;
  slug: string;
  name: string;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  profileUrl: string | null;
  knownForDepartment: string | null;
  alsoKnownAs: string[];
  credits: PersonCredit[];
}
