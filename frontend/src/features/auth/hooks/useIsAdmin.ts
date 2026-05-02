import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

export function useIsAdmin() {
  const { data: user, isLoading } = useCurrentUser();
  return {
    isAdmin: user?.role === "ROLE_ADMIN",
    isLoading,
  };
}
