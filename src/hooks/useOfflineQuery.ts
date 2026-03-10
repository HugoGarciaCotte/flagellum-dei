import { useEffect } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { setCacheData, getCacheData } from "@/lib/offlineQueue";

/**
 * Wraps useQuery with localStorage caching for offline support.
 * On success, caches data. When offline with no data, returns cached data.
 */
export function useOfflineQuery<T>(
  cacheKey: string,
  options: UseQueryOptions<T, Error, T>,
) {
  const online = useNetworkStatus();

  const query = useQuery<T, Error, T>({
    ...options,
    retry: online ? (options.retry as number ?? 3) : 0,
    // When offline, don't refetch on mount/window focus
    refetchOnMount: online ? (options.refetchOnMount ?? true) : false,
    refetchOnWindowFocus: online ? (options.refetchOnWindowFocus ?? true) : false,
  });

  // Cache on success
  useEffect(() => {
    if (query.data !== undefined && query.data !== null) {
      setCacheData(cacheKey, query.data);
    }
  }, [query.data, cacheKey]);

  // Return cached data when offline and no fresh data
  if (query.data === undefined && !online) {
    const cached = getCacheData<T>(cacheKey);
    if (cached !== null) {
      return {
        ...query,
        data: cached,
        isLoading: false,
        isFetching: false,
      };
    }
  }

  return query;
}
