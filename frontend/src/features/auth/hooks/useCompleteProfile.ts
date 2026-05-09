import { useMutation } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";

export function useCompleteProfile() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (username: string) => authService.completeProfile(username),
    onSuccess: (user) => {
      setUser(user);
    },
  });
}
