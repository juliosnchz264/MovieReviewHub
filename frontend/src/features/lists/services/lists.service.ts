import { api } from "@/lib/api";
import type {
  AddListItemRequest,
  CustomList,
  InMyListsResponse,
  ListCreateRequest,
  ListItem,
  ListItemKind,
  ListItemsPage,
  ListUpdateRequest,
  UpdateListItemRequest,
  UserListsPage,
} from "@/types/list";

export const listsService = {
  async myLists(): Promise<CustomList[]> {
    const { data } = await api.get<CustomList[]>("/users/me/lists");
    return data;
  },

  async getBySlug(slug: string): Promise<CustomList> {
    const { data } = await api.get<CustomList>(`/lists/${slug}`);
    return data;
  },

  async items(listId: number, page = 0, size = 30): Promise<ListItemsPage> {
    const { data } = await api.get<ListItemsPage>(`/lists/${listId}/items`, {
      params: { page, size },
    });
    return data;
  },

  async byUser(userId: number, page = 0, size = 20): Promise<UserListsPage> {
    const { data } = await api.get<UserListsPage>(`/users/${userId}/lists`, {
      params: { page, size },
    });
    return data;
  },

  async create(req: ListCreateRequest): Promise<CustomList> {
    const { data } = await api.post<CustomList>("/users/me/lists", req);
    return data;
  },

  async update(id: number, req: ListUpdateRequest): Promise<CustomList> {
    const { data } = await api.patch<CustomList>(`/lists/${id}`, req);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/lists/${id}`);
  },

  async addItem(listId: number, req: AddListItemRequest): Promise<ListItem> {
    const { data } = await api.post<ListItem>(`/lists/${listId}/items`, req);
    return data;
  },

  async updateItem(
    listId: number,
    itemId: number,
    req: UpdateListItemRequest
  ): Promise<ListItem> {
    const { data } = await api.patch<ListItem>(`/lists/${listId}/items/${itemId}`, req);
    return data;
  },

  async removeItem(listId: number, itemId: number): Promise<void> {
    await api.delete(`/lists/${listId}/items/${itemId}`);
  },

  async inMyLists(kind: ListItemKind, targetId: number): Promise<number[]> {
    const path = kind === "MOVIE"
      ? `/movies/${targetId}/in-my-lists`
      : `/series/${targetId}/in-my-lists`;
    const { data } = await api.get<InMyListsResponse>(path);
    return data.listIds;
  },
};
