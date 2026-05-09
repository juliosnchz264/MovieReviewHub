import { api } from "@/lib/api";
import type { AuthResponse, User } from "@/types/auth";
import type {
  AccountStats,
  AvailabilityResponse,
  ChangePasswordRequest,
  DeleteAccountRequest,
  UpdateEmailRequest,
  UpdateUsernameRequest,
} from "@/types/account";

export const accountService = {
  async stats(): Promise<AccountStats> {
    const { data } = await api.get<AccountStats>("/users/me/stats");
    return data;
  },

  async checkUsername(value: string): Promise<boolean> {
    const { data } = await api.get<AvailabilityResponse>(
      "/users/availability/username",
      { params: { value } }
    );
    return data.available;
  },

  async checkEmail(value: string): Promise<boolean> {
    const { data } = await api.get<AvailabilityResponse>(
      "/users/availability/email",
      { params: { value } }
    );
    return data.available;
  },

  async updateUsername(payload: UpdateUsernameRequest): Promise<User> {
    const { data } = await api.patch<User>("/users/me/username", payload);
    return data;
  },

  async updateEmail(payload: UpdateEmailRequest): Promise<AuthResponse> {
    const { data } = await api.patch<AuthResponse>("/users/me/email", payload);
    return data;
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await api.patch("/users/me/password", payload);
  },

  async deleteAccount(payload: DeleteAccountRequest): Promise<void> {
    await api.delete("/users/me", { data: payload });
  },
};
