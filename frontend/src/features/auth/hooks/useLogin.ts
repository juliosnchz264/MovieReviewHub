import { useMutation } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";
import type { LoginRequest } from "@/types/auth";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}
