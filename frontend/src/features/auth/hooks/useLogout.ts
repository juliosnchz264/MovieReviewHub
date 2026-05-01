import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clear();
      qc.clear();
    },
  });
}
