import { QueryClient } from "@tanstack/react-query";

/**
 * Build a fresh QueryClient per request. Used for SSR prefetch + dehydrate.
 * Higher staleTime than the client default so the hydrated payload isn't
 * thrown away on mount.
 */
export function makeServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 0,
      },
    },
  });
}
