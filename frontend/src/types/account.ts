export interface UpdateUsernameRequest {
  newUsername: string;
  currentPassword?: string;
}

export interface UpdateEmailRequest {
  newEmail: string;
  currentPassword?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SetPasswordRequest {
  newPassword: string;
}

export interface DeleteAccountRequest {
  currentPassword?: string;
}

export interface AvailabilityResponse {
  available: boolean;
}

export interface AccountStats {
  totalReviews: number;
  totalFavorites: number;
  memberSince: string;
}
