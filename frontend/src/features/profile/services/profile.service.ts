import { api } from "@/lib/api";
import type { PublicProfile, UpdateProfileRequest } from "@/types/user";

export const profileService = {
  async publicProfile(userId: number): Promise<PublicProfile> {
    const { data } = await api.get<PublicProfile>(`/users/${userId}/profile`);
    return data;
  },

  async updateMyProfile(req: UpdateProfileRequest): Promise<PublicProfile> {
    const { data } = await api.patch<PublicProfile>("/users/me/profile", req);
    return data;
  },
};
