

## Replace branding Shield icons with 🜹 Logo

Replace `Shield` icons used as **branding/identity elements** with the `<Logo>` component. Keep `Shield`/`ShieldCheck`/`ShieldAlert` where they serve a **functional meaning** (e.g. prerequisites, validation, "become GM").

### Changes

**`src/pages/Auth.tsx`**
- Replace the large `<Shield className="h-12 w-12">` hero icon with `<Logo className="text-5xl">`
- Replace `<Shield className="h-4 w-4">` in the Sign Up tab trigger with `<Logo className="text-sm">`
- Remove `Shield` from lucide import, add `Logo` import

**`src/pages/Install.tsx`**
- Replace `<Shield className="h-12 w-12">` hero icon with `<Logo className="text-5xl">`
- Remove `Shield` from lucide import, add `Logo` import

**`src/components/CharacterCreationWizard.tsx`**
- Replace `<Shield className="h-12 w-12">` in the intro step with `<Logo className="text-5xl">`
- Remove `Shield` from lucide import, add `Logo` import

**Not changing** (functional icons, not branding):
- `ShieldCheck` in ManageFeats (prerequisites indicator)
- `ShieldCheck` in Dashboard ("Become a Game Master")
- `ShieldAlert` in CharacterFeatPicker (validation warning)
- `Shield` in Home.tsx RoleCard for "Survive" (thematic, not branding)

### Files to edit
- `src/pages/Auth.tsx`
- `src/pages/Install.tsx`
- `src/components/CharacterCreationWizard.tsx`

