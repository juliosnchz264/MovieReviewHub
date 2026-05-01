import { useQuery } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authService.me(),
    enabled: accessToken !== null,
    staleTime: 60_000,
  });
}
