

## Show ambiance pill always with contextual messages

Currently `GameTimer` returns `null` when there's no ambiance track. Instead, it should always render the pill with context-appropriate text.

### Approach

We need to distinguish two states that are currently both hidden:
1. **No section selected yet** → `ambianceTrack` is the scenario root's track (could be undefined/empty)
2. **Section selected but no ambiance** → `ambianceTrack` is undefined/empty

To differentiate, pass a new prop `hasActiveSection` from `HostGame.tsx`.

### Changes

**`src/components/GameTimer.tsx`**:
- Add `hasActiveSection?: boolean` to props
- Remove the `if (!hasAmbiance) return null;` early return
- Update `getAmbianceText()`:
  - If no section selected (`!hasActiveSection`): show "Press ▶ on a section to begin"
  - If section selected but no ambiance track (`hasActiveSection && !hasAmbiance`): show "No ambiance for this section"
  - Keep existing running/paused/active logic when there IS a track
- When `!hasAmbiance`, render only the collapsed pill (no expand behavior, no timer controls)

**`src/pages/HostGame.tsx`** line 175:
- Pass `hasActiveSection={!!activeSection}` to `GameTimer`

**`src/i18n/en.ts`**:
- `"timer.noSection": "Press ▶ on a section to begin"`
- `"timer.noAmbiance": "None for this section"`

**`src/i18n/fr.ts`**:
- `"timer.noSection": "Appuyez sur ▶ pour lancer une section"`
- `"timer.noAmbiance": "Aucune pour cette section"`

Four files, minimal changes.

