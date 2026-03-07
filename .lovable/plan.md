

## Plan: Forgot Password Flow with Custom Email Domain

### Two parts needed:

**1. Set up custom email domain (cypheme.org)**
- First, configure the sender domain via the email setup dialog so emails come from `noreply@cypheme.org`
- Then scaffold auth email templates, apply Quest Scroll branding (dark RPG theme with Cinzel/Crimson Text fonts, gold accents), and deploy the `auth-email-hook` edge function

**2. Add forgot password UI flow**
- **Auth.tsx**: Add a "Forgot Password?" link on the login tab that shows an email input + "Send Reset Link" button, calling `supabase.auth.resetPasswordForEmail()` with `redirectTo` pointing to `/reset-password`
- **ResetPassword.tsx**: New page at `/reset-password` — checks for `type=recovery` in URL hash, shows a "Set New Password" form, calls `supabase.auth.updateUser({ password })`
- **App.tsx**: Add `/reset-password` route

### Steps in order:
1. Open the email setup dialog to configure `cypheme.org` as the sender domain
2. After domain is set: scaffold templates → brand them → deploy edge function
3. Add forgot password link + reset password page to the app

