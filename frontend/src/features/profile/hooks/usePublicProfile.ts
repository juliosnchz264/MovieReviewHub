import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/features/profile/services/profile.service";
import { useAuthStore } from "@/store/auth";
import type {
  AccountSettings,
  UpdateAccountSettingsRequest,
  UpdateProfileRequest,
} from "@/types/user";
import type { User } from "@/types/auth";

export function usePublicProfile(userId: number | undefined) {
  return useQuery({
    queryKey: ["profile", "public", userId],
    queryFn: () => profileService.publicProfile(userId!),
    enabled: Number.isFinite(userId),
    staleTime: 60_000,
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdateProfileRequest) => profileService.updateMyProfile(req),
    onSuccess: (data) => {
      // Authoritative snapshot for this profile id.
      qc.setQueryData(["profile", "public", data.id], data);
      // Other viewers of this profile (lists, etc) — drop and refetch on next mount.
      qc.invalidateQueries({ queryKey: ["profile", "public"], refetchType: "none" });
      // /auth/me drives Navbar / user-menu; trigger refetch.
      qc.invalidateQueries({ queryKey: ["currentUser"] });
      // Mirror overlapping fields into the auth store so any component that
      // reads `useAuthStore.user` directly (Navbar fallback, sidebars, etc.)
      // reflects the change immediately without waiting for /auth/me.
      const store = useAuthStore.getState();
      if (store.user) {
        store.setUser({
          ...store.user,
          handle: data.handle,
          avatarUrl: data.avatarUrl,
          themeColor: data.themeColor,
        });
      }
    },
  });
}

export function useAccountSettings() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["account", "settings"],
    queryFn: () => profileService.getSettings(),
    enabled: accessToken !== null,
    staleTime: 60_000,
  });
}

export function useUpdateAccountSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdateAccountSettingsRequest) => profileService.updateSettings(req),
    onMutate: async (req) => {
      await qc.cancelQueries({ queryKey: ["account", "settings"] });
      const prev = qc.getQueryData<AccountSettings>(["account", "settings"]);
      if (prev) {
        qc.setQueryData<AccountSettings>(["account", "settings"], {
          ...prev,
          ...(req as AccountSettings),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["account", "settings"], ctx.prev);
    },
    onSuccess: (data) => {
      qc.setQueryData<AccountSettings>(["account", "settings"], data);
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: (data: User) => {
      qc.setQueryData(["currentUser"], data);
      qc.invalidateQueries({ queryKey: ["profile", "public"] });
      useAuthStore.getState().setUser(data);
    },
  });
}

export function useRemoveAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => profileService.removeAvatar(),
    onSuccess: (data: User) => {
      qc.setQueryData(["currentUser"], data);
      qc.invalidateQueries({ queryKey: ["profile", "public"] });
      useAuthStore.getState().setUser(data);
    },
  });
}
