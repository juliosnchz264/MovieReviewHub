import { api } from "@/lib/api";
import type { PagedResponse } from "@/types/movie";
import type { Review } from "@/types/review";
import type { AdminStats, AdminUser } from "@/types/admin";

export const adminService = {
  async stats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>("/admin/stats");
    return data;
  },

  async listUsers(search?: string, page = 0, size = 20): Promise<PagedResponse<AdminUser>> {
    const { data } = await api.get<PagedResponse<AdminUser>>("/admin/users", {
      params: { search: search || undefined, page, size },
    });
    return data;
  },

  async banUser(id: number): Promise<AdminUser> {
    const { data } = await api.post<AdminUser>(`/admin/users/${id}/ban`);
    return data;
  },

  async unbanUser(id: number): Promise<AdminUser> {
    const { data } = await api.post<AdminUser>(`/admin/users/${id}/unban`);
    return data;
  },

  async listReviews(page = 0, size = 20): Promise<PagedResponse<Review>> {
    const { data } = await api.get<PagedResponse<Review>>("/admin/reviews", {
      params: { page, size },
    });
    return data;
  },
};
