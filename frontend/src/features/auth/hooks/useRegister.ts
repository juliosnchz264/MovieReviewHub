import { useMutation } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";
import type { RegisterRequest } from "@/types/auth";

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterRequest) => authService.register(payload),
  });
}
