import { useEffect } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAuth } from "@/contexts/AuthContext";
import { setCacheData, getCacheData, getIsSyncing } from "@/lib/offlineQueue";

/**
 * Wraps useQuery with localStorage caching for offline support.
 * Blocks queries until syncReady (queue drained) to prevent stale overwrites.
 */
export function useOfflineQuery<T>(
  cacheKey: string,
  options: UseQueryOptions<T, Error, T>,
) {
  const online = useNetworkStatus();
  const { syncReady, isLocalGuest } = useAuth();
  const effectivelyOffline = !online;
  const syncing = getIsSyncing();

  // Queries only fire when: online + syncReady + not syncing + not a local guest
  const canFetch = syncReady && !effectivelyOffline && !syncing && !isLocalGuest;

  const query = useQuery<T, Error, T>({
    ...options,
    enabled: canFetch ? (options.enabled ?? true) : false,
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

  // Return cached data when offline/syncing and no fresh data
  if (query.data === undefined && (effectivelyOffline || !syncReady || syncing || isLocalGuest)) {
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

  // Fallback to cache when technically online but query failed (server unreachable)
  if (query.isError && query.data === undefined && !effectivelyOffline) {
    const cached = getCacheData<T>(cacheKey);
    if (cached !== null) {
      window.dispatchEvent(new Event("offline-query-degraded"));
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
