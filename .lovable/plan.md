

## Fix: Guest stuck on "Joining quest..." — `useOfflineQuery` still treats guests as offline

### Root Cause
`src/hooks/useOfflineQuery.ts` line 17 still has:
```typescript
const effectivelyOffline = !online || isGuest;
```

This was missed during the anonymous auth refactor. Since anonymous guests have `isGuest = true`, **all queries are disabled** for them — the game data never loads, causing the infinite "Joining quest..." screen.

### Fix
**`src/hooks/useOfflineQuery.ts`** — Remove `isGuest` from the offline check. Anonymous guests now have real database sessions, so they should query the DB normally when online.

- Change `const effectivelyOffline = !online || isGuest;` to `const effectivelyOffline = !online;`
- Remove the `useAuth` import and `isGuest` destructuring (no longer needed)

This is a one-line fix that resolves the issue for all components using `useOfflineQuery` (PlayGame, Dashboard, HostGame, etc.).

