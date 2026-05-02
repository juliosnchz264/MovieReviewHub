import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { adminService } from "@/features/admin/services/admin.service";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminService.stats(),
    staleTime: 30_000,
  });
}

export function useAdminUsers(search: string, page = 0, size = 20) {
  return useQuery({
    queryKey: ["admin", "users", search, page, size],
    queryFn: () => adminService.listUsers(search, page, size),
    placeholderData: keepPreviousData,
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminService.banUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminService.unbanUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminReviews(page = 0, size = 20) {
  return useQuery({
    queryKey: ["admin", "reviews", page, size],
    queryFn: () => adminService.listReviews(page, size),
    placeholderData: keepPreviousData,
  });
}
