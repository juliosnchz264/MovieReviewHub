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
      qc.setQueryData(["profile", "public", data.id], data);
      qc.invalidateQueries({ queryKey: ["profile", "public"] });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
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
    },
  });
}
