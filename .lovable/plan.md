

## Auto-retry anonymous sign-in before any sync operation

### Problem
When `signInAnonymously()` fails during guest entry, the user becomes a "local guest" with no Supabase session. Even when connectivity is restored, the sync manager never retries authentication — so all `pullAll`, `pushAll`, and `pullTable` calls silently fail (RLS blocks unauthenticated queries).

### Approach
Add an `ensureSession` helper in `syncManager.ts` that checks for an active Supabase session before any server operation. If there's no session and a local guest exists, it retries `signInAnonymously()`. If successful, the `onAuthStateChange` listener in `AuthContext` will automatically clear the local guest and set the real session.

### Changes

**`src/lib/syncManager.ts`**

Add an `ensureSession()` function at the top:

```typescript
async function ensureSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return true;

  // No session — try anonymous sign-in if we have a local guest
  const localGuest = localStorage.getItem("local-guest-user");
  if (!localGuest || !navigator.onLine) return false;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("Session retry failed:", error.message);
    return false;
  }
  // onAuthStateChange will update AuthContext
  return true;
}
```

Call `ensureSession()` at the start of `pullAll`, `pushAll`, and `pullTable`. If it returns `false`, skip the server operation silently (local data remains intact).

**No changes to `AuthContext.tsx`** — the existing `onAuthStateChange` listener already handles session creation (clears local guest, sets session, triggers `initSync`).

### Files to edit

| File | Change |
|------|--------|
| `src/lib/syncManager.ts` | Add `ensureSession()`, call it in `pullAll`, `pushAll`, `pullTable` |

