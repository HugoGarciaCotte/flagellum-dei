

## Fix: Portrait Generation — Missing Config Entry

### Problem
The edge function `generate-character-portrait` is not listed in `supabase/config.toml`. Without this entry, the function is never deployed, so invocations fail silently.

### Fix
Add the following entry to `supabase/config.toml`:

```toml
[functions.generate-character-portrait]
verify_jwt = false
```

This is a one-line config addition. The function code already exists and handles auth internally (verifies the Authorization header manually), so `verify_jwt = false` is correct and consistent with the other functions.

