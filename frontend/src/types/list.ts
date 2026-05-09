import type { Movie, PagedResponse } from "./movie";
import type { Series } from "./series";

export type ListVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
export type DefaultListKind = "WATCHLIST" | "WATCHED";
export type ListItemKind = "MOVIE" | "SERIES";

export interface ListOwner {
  id: number;
  username: string;
}

export interface CustomList {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  visibility: ListVisibility;
  isDefault: boolean;
  defaultKind: DefaultListKind | null;
  itemCount: number;
  owner: ListOwner;
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  id: number;
  kind: ListItemKind;
  movie: Movie | null;
  series: Series | null;
  note: string | null;
  position: number | null;
  addedAt: string;
}

export type ListItemsPage = PagedResponse<ListItem>;
export type PublicListsPage = PagedResponse<CustomList>;

export interface ListCreateRequest {
  title: string;
  description?: string | null;
  visibility: ListVisibility;
}

export interface ListUpdateRequest {
  title?: string;
  description?: string | null;
  visibility?: ListVisibility;
}

export interface AddListItemRequest {
  kind: ListItemKind;
  targetId: number;
  note?: string | null;
}

export interface UpdateListItemRequest {
  note?: string | null;
  position?: number | null;
}

export interface InMyListsResponse {
  listIds: number[];
}
