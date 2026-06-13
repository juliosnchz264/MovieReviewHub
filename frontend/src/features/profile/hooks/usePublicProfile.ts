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
      // Authoritative snapshot from the PATCH response — write directly to
      // every key that mirrors this profile so observers re-render with the
      // new value synchronously. DO NOT invalidateQueries for this same key:
      // an immediate refetch can hit a replica that hasn't yet seen the
      // commit (Supabase transaction pooler) and overwrite the fresh data
      // with a stale snapshot, making the form revert and the profile view
      // lag by several seconds.
      qc.setQueryData(["profile", "public", data.id], data);
      // Mark other "public profile" keys stale (different ids viewed
      // elsewhere) but don't refetch until they remount.
      qc.invalidateQueries({
        queryKey: ["profile", "public"],
        refetchType: "none",
        predicate: (q) => q.queryKey[2] !== data.id,
      });
      // /auth/me drives Navbar / user-menu. Refetch is safe here because the
      // server returns the same authoritative User the JWT already pointed at,
      // and the navbar tolerates a brief stale snapshot.
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

function patchAvatarInProfileCaches(qc: ReturnType<typeof useQueryClient>, user: User) {
  // The avatar endpoint returns a User, not the full PublicProfile, so we
  // patch the avatarUrl field on every cached profile that points at this
  // user id and leave the rest untouched. No refetch — same read-after-write
  // hazard described in useUpdateMyProfile.
  qc.setQueriesData<{ id: number; avatarUrl: string | null } & Record<string, unknown>>(
    { queryKey: ["profile", "public"] },
    (prev) => {
      if (!prev || prev.id !== user.id) return prev;
      return { ...prev, avatarUrl: user.avatarUrl };
    },
  );
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: (data: User) => {
      qc.setQueryData(["currentUser"], data);
      patchAvatarInProfileCaches(qc, data);
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
      patchAvatarInProfileCaches(qc, data);
      useAuthStore.getState().setUser(data);
    },
  });
}
