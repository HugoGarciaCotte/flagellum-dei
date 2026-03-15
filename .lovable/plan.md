

## Fix: Spotify Token Exchange Edge Function

### Root Cause

The edge function has two bugs preventing it from working:

1. **`supabase.auth.getClaims(token)` does not exist** in supabase-js v2 — it crashes before ever calling Spotify, returning an internal error that surfaces as `INVALID_CLIENT`. Replace with `supabase.auth.getUser()`.

2. **Duplicate `const serviceClient`** — declared once in the `refresh_token` branch (line 68) and again at line 115. In the `authorization_code` flow, this causes a redeclaration error since both are in the same `try` block scope.

### Changes

**`supabase/functions/spotify-token-exchange/index.ts`**:
- Replace `getClaims(token)` with `getUser()` which returns the authenticated user from the JWT
- Hoist the service-role client to a single declaration shared by both code paths
- Add `console.log` for the Spotify client ID to help verify the secret matches the frontend value (`0f359b30c2484879a3d42b57ac0aabab`)

```ts
// Auth: replace getClaims with getUser
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) { return 401; }
const userId = user.id;

// Single service client declaration before the branches
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

No other files need changes.

