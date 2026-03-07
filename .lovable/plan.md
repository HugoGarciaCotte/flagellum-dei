

## Plan: Enable Auto-Confirm Email Signups

The confirmation email is being sent because email verification is enabled by default. Two changes are needed:

### 1. Configure auth to auto-confirm signups
Use the `cloud--configure_auth` tool to enable `autoconfirm` for email signups so users are logged in immediately.

### 2. Update signup success toast in `src/pages/Auth.tsx`
Remove the "Check your email" toast after signup. Since auto-confirm logs the user in immediately, the `onAuthStateChange` listener will handle the redirect — no toast is needed on success.

**Change in `handleSignup`** (~line 46-48):
- Remove the `else` block that shows "Check your email / We sent you a confirmation link"
- Optionally show a brief "Welcome!" toast, or let the auth state change handle everything silently

