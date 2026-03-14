

## Ambiance Track — Highlighting Clarification

The previous plan already covers this correctly but to be explicit about the highlighting rule:

**Highlighting logic**: The "active" (highlighted) row is the one whose `minutes` value is the largest that is still `<= elapsedMinutes`. So at 7 minutes elapsed, the 5min row is highlighted. At 15 minutes, the 15min row becomes highlighted. All rows are always visible — highlighting just marks which event the GM should be narrating.

No changes needed to the plan. This is already how it was designed. Proceeding with implementation as previously approved:

1. **`src/lib/parseWikitext.ts`** — Add `AmbianceEntry` type, parse `{{Ambiance Track}}` blocks, add `resolveAmbianceTrack()`
2. **`src/components/GameTimer.tsx`** — Accept `ambianceTrack` prop, add tabbed UI (Timer / Ambiance), render all entries in a table, highlight the row where `entry.minutes` is the largest value `<= Math.floor(elapsed / 60)`
3. **`src/pages/HostGame.tsx`** — Resolve ambiance track for active section, pass to GameTimer
4. **`src/components/ScenarioEditorPanel.tsx`** — Enable ambiance track insertion
5. **`src/i18n/en.ts`** + **`src/i18n/fr.ts`** — Add translation keys

