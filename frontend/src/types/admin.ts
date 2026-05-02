import type { UserRole } from "./auth";

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  admins: number;
  totalMovies: number;
  totalReviews: number;
  totalFavorites: number;
}
