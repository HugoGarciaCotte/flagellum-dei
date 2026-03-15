

## Scenario Teaser: Copy-to-Clipboard + Line Break Fix

### Problems
1. **Teaser not copyable**: The scenario cards in the "Host a Game" section show the teaser text but there's no way to copy it to send to players before the game.
2. **Line breaks lost**: Teasers contain `\n` characters (e.g. the Chapter 1 teaser), but `<CardDescription>` renders them as plain text in a single line — `\n` has no effect in HTML inline flow.

### Plan

**Line 307 area in `src/pages/Dashboard.tsx`** — Replace the simple teaser text with:
- Render teaser using `whitespace-pre-line` CSS so `\n` produces visible line breaks
- Add a 📋 copy button next to the teaser that copies it to clipboard with a toast confirmation
- Add a small label like "Send to players before the session" (translated)

**`src/i18n/en.ts`** + **`src/i18n/fr.ts`** — Add keys:
- `dashboard.sendBeforeGame` → "Send to players before the session" / "Envoyer aux joueurs avant la partie"
- `dashboard.teaserCopied` → "Teaser copied!" / "Teaser copié !"

### Files to modify
1. `src/pages/Dashboard.tsx` — update scenario card teaser rendering (~15 lines)
2. `src/i18n/en.ts` — 2 new keys
3. `src/i18n/fr.ts` — 2 new keys

