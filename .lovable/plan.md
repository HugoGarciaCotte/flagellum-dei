

## Plan: Fix auto-login redirect after signup + erase accounts

### Problem
The signup works and the session is created (confirmed by auth logs showing `immediate_login_after_signup: true`), but the Auth page at `/auth` doesn't redirect to `/` when the user becomes authenticated. The `onAuthStateChange` listener in `AuthContext` sets the session, but the Auth page has no logic to react to that.

### Fix: Add redirect in Auth.tsx
Add `useAuth()` and `useNavigate()` to `Auth.tsx`. When `user` is set (i.e. after signup or login), redirect to `/`.

```tsx
const { user } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (user) navigate("/", { replace: true });
}, [user, navigate]);
```

### Erase accounts
After the code fix, delete all data from `game_players`, `games`, `characters`, `user_roles`, `profiles`, and `auth.users`.

### Files to modify
| File | Change |
|---|---|
| `src/pages/Auth.tsx` | Add auth check + redirect to `/` when user is logged in |

