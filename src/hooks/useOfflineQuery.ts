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
  const effectivelyOffline = !online;

  const query = useQuery<T, Error, T>({
    ...options,
    enabled: effectivelyOffline ? false : (options.enabled ?? true),
    retry: effectivelyOffline ? 0 : (options.retry as number ?? 3),
    refetchOnMount: effectivelyOffline ? false : (options.refetchOnMount ?? true),
    refetchOnWindowFocus: effectivelyOffline ? false : (options.refetchOnWindowFocus ?? true),
  });

  // Cache on success
  useEffect(() => {
    if (query.data !== undefined && query.data !== null) {
      setCacheData(cacheKey, query.data);
    }
  }, [query.data, cacheKey]);

  // Return cached data when offline/guest and no fresh data
  if (query.data === undefined && effectivelyOffline) {
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
