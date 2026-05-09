import { useQuery } from "@tanstack/react-query";
import { accountService } from "@/features/account/services/account.service";
import { useAuthStore } from "@/store/auth";

export function useAccountStats() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["account", "stats"],
    queryFn: accountService.stats,
    enabled: !!accessToken,
    staleTime: 60_000,
  });
}
