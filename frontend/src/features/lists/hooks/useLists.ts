import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listsService } from "@/features/lists/services/lists.service";
import { useAuthStore } from "@/store/auth";
import type {
  AddListItemRequest,
  ListCreateRequest,
  ListItemKind,
  ListUpdateRequest,
  UpdateListItemRequest,
} from "@/types/list";

export function useMyLists() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["lists", "me"],
    queryFn: () => listsService.myLists(),
    enabled: accessToken !== null,
    staleTime: 30_000,
  });
}

export function useList(slug: string | undefined) {
  return useQuery({
    queryKey: ["list", slug],
    queryFn: () => listsService.getBySlug(slug!),
    enabled: Boolean(slug),
  });
}

export function useListItems(listId: number | undefined, page = 0, size = 30) {
  return useQuery({
    queryKey: ["list-items", listId, page, size],
    queryFn: () => listsService.items(listId!, page, size),
    enabled: Number.isFinite(listId),
    placeholderData: keepPreviousData,
  });
}

export function useListsByUser(userId: number | undefined, page = 0, size = 20) {
  // Viewer en queryKey: backend filtra por identidad (owner ve PRIVATE/UNLISTED).
  // Sin esto, login/logout reusaria un cache que podria estar restringido o expandido.
  const viewerId = useAuthStore((s) => s.user?.id ?? null);
  return useQuery({
    queryKey: ["lists", "by-user", userId, viewerId, page, size],
    queryFn: () => listsService.byUser(userId!, page, size),
    enabled: Number.isFinite(userId),
    placeholderData: keepPreviousData,
  });
}

export function useInMyLists(kind: ListItemKind, targetId: number | undefined) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["in-my-lists", kind, targetId],
    queryFn: () => listsService.inMyLists(kind, targetId!),
    enabled: accessToken !== null && Number.isFinite(targetId),
    staleTime: 30_000,
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ListCreateRequest) => listsService.create(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists", "me"] });
      qc.invalidateQueries({ queryKey: ["lists", "by-user"] });
    },
  });
}

export function useUpdateList(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ListUpdateRequest) => listsService.update(id, req),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lists", "me"] });
      qc.invalidateQueries({ queryKey: ["lists", "by-user"] });
      qc.setQueryData(["list", data.slug], data);
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => listsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists", "me"] });
      qc.invalidateQueries({ queryKey: ["lists", "by-user"] });
    },
  });
}

export function useAddListItem(listId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: AddListItemRequest) => listsService.addItem(listId, req),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["list-items", listId] });
      qc.invalidateQueries({ queryKey: ["lists", "me"] });
      qc.invalidateQueries({ queryKey: ["lists", "by-user"] });
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["in-my-lists", variables.kind, variables.targetId] });
    },
  });
}

export function useRemoveListItem(listId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => listsService.removeItem(listId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list-items", listId] });
      qc.invalidateQueries({ queryKey: ["lists", "me"] });
      qc.invalidateQueries({ queryKey: ["lists", "by-user"] });
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["in-my-lists"] });
    },
  });
}

export function useUpdateListItem(listId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, req }: { itemId: number; req: UpdateListItemRequest }) =>
      listsService.updateItem(listId, itemId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list-items", listId] });
    },
  });
}
