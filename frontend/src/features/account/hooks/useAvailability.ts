import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { accountService } from "@/features/account/services/account.service";

interface Options {
  field: "username" | "email";
  value: string;
  currentValue: string;
  minLength?: number;
}

export function useAvailability({ field, value, currentValue, minLength = 3 }: Options) {
  const debounced = useDebouncedValue(value.trim(), 400);
  const sameAsCurrent = debounced === currentValue.trim();
  const tooShort = debounced.length < minLength;
  const enabled = !sameAsCurrent && !tooShort;

  const query = useQuery({
    queryKey: ["availability", field, debounced],
    queryFn: () =>
      field === "username"
        ? accountService.checkUsername(debounced)
        : accountService.checkEmail(debounced),
    enabled,
    staleTime: 30_000,
    retry: false,
  });

  return {
    available: query.data,
    isChecking: enabled && (query.isFetching || debounced !== value.trim()),
    sameAsCurrent,
    tooShort,
    enabled,
  };
}
