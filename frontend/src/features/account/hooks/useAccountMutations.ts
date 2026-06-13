import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { accountService } from "@/features/account/services/account.service";
import { useAuthStore } from "@/store/auth";
import type { AuthResponse, User } from "@/types/auth";

/**
 * Patch the username on every cached PublicProfile that points at this user.
 * Same shape-aware partial update we use for avatar swaps: avoids a refetch
 * that could race the Supabase pooler's read-after-write and overwrite the
 * fresh username with a stale snapshot.
 */
function patchUsernameInProfileCaches(qc: QueryClient, user: User) {
  qc.setQueriesData<{ id: number; username: string } & Record<string, unknown>>(
    { queryKey: ["profile", "public"] },
    (prev) => {
      if (!prev || prev.id !== user.id) return prev;
      return { ...prev, username: user.username };
    },
  );
}

export function useUpdateUsername() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);

  return useMutation({
    mutationFn: accountService.updateUsername,
    onSuccess: (user: User) => {
      if (accessToken) setSession(accessToken, user);
      qc.setQueryData(["currentUser"], user);
      patchUsernameInProfileCaches(qc, user);
    },
  });
}

export function useUpdateEmail() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: accountService.updateEmail,
    onSuccess: (res: AuthResponse) => {
      // Backend reissues tokens on email change. Replace current session
      // with the new pair so the next refresh keeps working.
      setSession(res.accessToken, res.user);
      qc.setQueryData(["currentUser"], res.user);
      patchUsernameInProfileCaches(qc, res.user);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: accountService.changePassword,
  });
}

export function useSetLocalPassword() {
  return useMutation({
    mutationFn: accountService.setLocalPassword,
  });
}

export function useDeleteAccount() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: accountService.deleteAccount,
    onSuccess: () => {
      clear();
    },
  });
}
