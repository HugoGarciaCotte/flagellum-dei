

## Fix: Query failure fallback when technically "online" but server unreachable

### The Problem

The offline banner and cached data fallback **only** trigger when `navigator.onLine` is `false`. But there are common scenarios where `navigator.onLine` is `true` yet data can't be fetched:

- Server is down / dead
- WiFi connected but no actual internet
- Temporary network interruption that doesn't trigger the browser's offline event

In these cases, queries fail after 3 retries, the user sees errors or empty screens, but no banner and no cached fallback.

### The Fix

**1. Enhance `useOfflineQuery` to fall back to cache on query error**

After the query fails (all retries exhausted), check if there's cached data and return it instead of an error state. This is a small addition to the existing hook — add a check: if `query.isError && query.data === undefined`, serve cached data.

**2. Enhance `OfflineBanner` to also show on "degraded" state**

Emit a custom event (e.g., `offline-query-degraded`) from `useOfflineQuery` when serving stale cache due to a failed fetch while technically online. The banner would show a yellow/warning state: "Server unreachable — using cached data".

### Changes

| File | Change |
|------|--------|
| `src/hooks/useOfflineQuery.ts` | Add fallback: if `query.isError` and cached data exists, return cached data. Dispatch `offline-query-degraded` event. |
| `src/components/OfflineBanner.tsx` | Listen for `offline-query-degraded` event. Show a warning-colored banner: "Server unreachable — using cached data" when online but degraded. Auto-dismiss after queries succeed again. |

### Key Logic

```typescript
// useOfflineQuery.ts — after existing cache check
if (query.isError && query.data === undefined) {
  const cached = getCacheData<T>(cacheKey);
  if (cached !== null) {
    window.dispatchEvent(new Event("offline-query-degraded"));
    return { ...query, data: cached, isLoading: false, isFetching: false };
  }
}
```

```typescript
// OfflineBanner.tsx — new "degraded" state
const [degraded, setDegraded] = useState(false);

useEffect(() => {
  const onDegraded = () => setDegraded(true);
  window.addEventListener("offline-query-degraded", onDegraded);
  return () => window.removeEventListener("offline-query-degraded", onDegraded);
}, []);

// Clear degraded when a query succeeds
useEffect(() => {
  if (online) {
    const timer = setTimeout(() => setDegraded(false), 10000);
    return () => clearTimeout(timer);
  }
}, [online]);

// In render: show warning banner when online but degraded
if (online && degraded && !syncing && !justSynced) {
  return <banner color="warning">Server unreachable — using cached data</banner>;
}
```

