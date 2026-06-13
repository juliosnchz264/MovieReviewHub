import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { peopleService } from "@/features/people/services/people.service";

export function usePopularPeople() {
  return useInfiniteQuery({
    queryKey: ["people", "popular"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => peopleService.popular(pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 0 ? undefined : allPages.length + 1,
    staleTime: 10 * 60_000,
  });
}

export function useSearchPeople(query: string) {
  return useInfiniteQuery({
    queryKey: ["people", "search", query],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => peopleService.search(query, pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 0 ? undefined : allPages.length + 1,
    enabled: query.trim().length > 0,
    staleTime: 5 * 60_000,
  });
}

export function usePerson(key: string | null) {
  return useQuery({
    queryKey: ["people", "detail", key],
    queryFn: () => peopleService.findById(key as string),
    enabled: key !== null && key !== "",
    staleTime: 10 * 60_000,
  });
}
