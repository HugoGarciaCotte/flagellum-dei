## Goal

Let anyone click a character portrait to open it large in a popup, with **Download** and **Dismiss** buttons.

## Scope

All places that render a character portrait avatar:
- `CharacterListItem` (used in PlayGame sheet, GMPlayerList, PlayerListSheet)
- `PlayGame` collapsed bottom bar avatar
- `CharacterSheet` portrait (edit view)
- `CharacterCreationWizard` preview portrait
- `GMPlayerList` / `PlayerListSheet` direct avatars (if any beyond CharacterListItem)

## Approach

1. **New shared component** `src/components/PortraitViewer.tsx`
   - Small wrapper that takes `src`, `alt`, `fileName`, and `children` (the trigger, typically the `<Avatar>`).
   - Renders children wrapped in a button with `cursor-zoom-in`; on click opens a `Dialog`.
   - Dialog content: large image (max 80vh, contain), title = character name, footer with two buttons:
     - **Download** — fetches the image as blob and uses `downloadFile`-style anchor (`a.download = \`${fileName}.jpg\``) so it saves locally instead of opening in browser.
     - **Dismiss** — `DialogClose`.
   - No-op (renders children directly with no click handler) when `src` is empty/null, so fallback initials stay non-interactive.

2. **Wire into each portrait site**
   - Replace the bare `<Avatar>` with `<PortraitViewer src={...} alt={name} fileName={name}><Avatar>...</Avatar></PortraitViewer>` in:
     - `CharacterListItem.tsx`
     - `PlayGame.tsx` (collapsed bar avatar)
     - `CharacterSheet.tsx` (edit portrait — keep existing "regenerate" controls untouched, just make the image itself clickable)
     - `CharacterCreationWizard.tsx` (preview)
   - In `GMPlayerList` and `PlayerListSheet`, portraits are already rendered through `CharacterListItem`, so they inherit the behavior automatically — verify and skip if already covered.

3. **i18n** — add 2 keys: `common.download`, `common.dismiss` (reuse existing if present; check `en.ts`/`fr.ts` first and only add if missing).

4. **Styling** — Dialog uses existing `DialogContent`; image centered with `object-contain`, rounded, subtle gold border to match theme. Stop propagation on the trigger click so wrapping rows (e.g. selectable character row in PlayGame) don't also toggle selection.

## Out of scope

No changes to upload/generation flow, sync, RLS, or data model. No new routes.

## Files

- **New:** `src/components/PortraitViewer.tsx`
- **Edit:** `src/components/CharacterListItem.tsx`, `src/pages/PlayGame.tsx`, `src/components/CharacterSheet.tsx`, `src/components/CharacterCreationWizard.tsx`, possibly `src/i18n/en.ts` + `src/i18n/fr.ts`
