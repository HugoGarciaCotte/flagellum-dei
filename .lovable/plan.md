

## Remove Email Verification Requirement

### Problem
Signup still shows "Please check your email to verify your account" messages, and email confirmation may still be required before users can sign in.

### Changes

1. **Enable auto-confirm** — Use the auth configuration tool to enable `autoconfirm` for email signups so users can sign in immediately after registering.

2. **`src/pages/Auth.tsx`** — Update two toast messages:
   - Line 68 (guest conversion): Change from `"Your guest data has been preserved. Please check your email to verify your account."` → `"Your guest data has been preserved. Welcome aboard!"`
   - After the standard signup `signUp` call (around line 76): Add a success toast with a welcome message instead of asking to check email. Currently there's no success toast for standard signup — should add one like `"Account created! Welcome to Flagellum Dei."` and redirect to home.

3. **`src/pages/Auth.tsx`** — After successful standard signup, navigate to `/` since auto-confirm means the user is immediately logged in.

