import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/features/profile/services/profile.service";
import type { UpdateProfileRequest } from "@/types/user";

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
    },
  });
}
