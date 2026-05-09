import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountService } from "@/features/account/services/account.service";
import { useAuthStore } from "@/store/auth";
import type { AuthResponse, User } from "@/types/auth";

export function useUpdateUsername() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);

  return useMutation({
    mutationFn: accountService.updateUsername,
    onSuccess: (user: User) => {
      if (accessToken) setSession(accessToken, user);
      qc.setQueryData(["currentUser"], user);
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
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: accountService.changePassword,
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
