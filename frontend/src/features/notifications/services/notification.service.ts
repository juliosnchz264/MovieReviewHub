import { api } from "@/lib/api";
import type {
  NotificationFilter,
  NotificationPage,
  UnreadCount,
} from "@/types/notification";

export const notificationService = {
  async list(
    page = 0,
    size = 20,
    filter: NotificationFilter = "all"
  ): Promise<NotificationPage> {
    const { data } = await api.get<NotificationPage>("/notifications", {
      params: { page, size, filter },
    });
    return data;
  },

  async unreadCount(): Promise<UnreadCount> {
    const { data } = await api.get<UnreadCount>("/notifications/unread-count");
    return data;
  },

  async markRead(ids: number[]): Promise<void> {
    await api.post("/notifications/mark-read", { ids });
  },

  async markAllRead(): Promise<void> {
    await api.post("/notifications/mark-all-read");
  },

  async markSeen(): Promise<void> {
    await api.post("/notifications/mark-seen");
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
