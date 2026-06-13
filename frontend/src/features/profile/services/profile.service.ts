import { api } from "@/lib/api";
import type {
  AccountSettings,
  PublicProfile,
  UpdateAccountSettingsRequest,
  UpdateProfileRequest,
} from "@/types/user";
import type { User } from "@/types/auth";

export const profileService = {
  async publicProfile(key: string | number): Promise<PublicProfile> {
    const { data } = await api.get<PublicProfile>(
      `/users/${encodeURIComponent(String(key))}/profile`
    );
    return data;
  },

  async updateMyProfile(req: UpdateProfileRequest): Promise<PublicProfile> {
    const { data } = await api.patch<PublicProfile>("/users/me/profile", req);
    return data;
  },

  async getSettings(): Promise<AccountSettings> {
    const { data } = await api.get<AccountSettings>("/users/me/settings");
    return data;
  },

  async updateSettings(req: UpdateAccountSettingsRequest): Promise<AccountSettings> {
    const { data } = await api.patch<AccountSettings>("/users/me/settings", req);
    return data;
  },

  async uploadAvatar(file: File): Promise<User> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<User>("/users/me/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async removeAvatar(): Promise<User> {
    const { data } = await api.delete<User>("/users/me/avatar");
    return data;
  },
};
