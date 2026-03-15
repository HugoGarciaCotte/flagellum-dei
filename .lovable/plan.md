

## Rename "Ambiance Track" Tag Option

The "Ambiance Track" insertion is for timed ambiance descriptions (5min/15min/30min text blocks), not music. It currently uses a `Music` icon which is misleading alongside the actual Spotify music options.

### Changes

**`src/components/ScenarioEditorPanel.tsx`**
- Change the icon from `Music` to `Wind` (or `CloudSun` / `Ear`) — `Wind` fits well for "ambiance/atmosphere"

**`src/i18n/en.ts`**
- Rename `"adminScenarios.insertTagAmbiance"` from `"Ambiance Track"` to `"Ambiance Description"` (or `"Atmosphere Cues"`)

**`src/i18n/fr.ts`**
- Rename to `"Description d'ambiance"`

