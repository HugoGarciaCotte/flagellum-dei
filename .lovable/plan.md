

## Plan: Extract remaining hardcoded strings to i18n

After the previous pass, ~20 hardcoded user-facing strings remain across 5 files. Admin-only editor tools (FeatEditorPanel, ScenarioEditorPanel, SubfeatSlotEditor, ManageFeats) are skipped as agreed.

### Strings to extract

**`src/components/FeatListItem.tsx`** (4 strings)
- `"Select"` (default quickActionLabel) → `feats.select`
- `"Hide"` / `"Info"` (toggle button) → `feats.hide` / `feats.info`
- `"Speciality..."` (placeholder) → `feats.speciality`
- `"— Pick —"` (select option) → `feats.pick`

**`src/components/GMPlayerList.tsx`** (4 strings)
- `"My Players"` → `gm.myPlayers`
- `"Unknown"` (fallback name) → `gm.unknown`
- `"No character selected"` → `gm.noCharacterSelected`
- `"Edit {name}'s Character"` → `gm.editCharacter`

**`src/components/PlayerListSheet.tsx`** (6 strings)
- `"Players ({n})"` → `gm.playersCount` (with `{count}` placeholder)
- `"No players have joined yet."` → `gm.noPlayers`
- `"Unknown player"` → `gm.unknownPlayer`
- `"No characters"` → `gm.noCharacters`
- `"No character selected"` → reuse `gm.noCharacterSelected`
- `"{n} other character(s)"` → `gm.otherCharacters` / `gm.otherCharacter`

**`src/components/WikiSectionTree.tsx`** (2 strings — tooltip labels)
- `"Description"` → `wiki.description`
- `"Prerequisites"` → `wiki.prerequisites`
- `"Special"` → `wiki.special`

**`src/components/CharacterListItem.tsx`** (2 strings)
- `"Unknown feat"` → `feats.unknownFeat`
- `"Unknown"` (subfeat fallback) → reuse `feats.unknownFeat`

**`src/pages/Home.tsx`** (2 strings — FAQ links)
- `"Remix on Lovable ↗"` → `home.faq.remixLovable`
- `"View on GitHub ↗"` → `home.faq.viewGithub`

**`src/pages/Dashboard.tsx`** (1 string)
- `"Flagellum Dei"` (PageHeader title, line 126) → `dashboard.title`
- `"Code: "` label (line 275) → `dashboard.code`
- `"Untitled"` fallback (lines 74, 83) → `dashboard.untitled`

### Implementation

1. Add ~22 new keys to `src/i18n/en.ts`
2. Update each component: import `useTranslation`, replace hardcoded strings with `t()` calls
3. For `WikiSectionTree` — it's not a hook-compatible function component at the inner level (`FeatLinkTooltip`, `SectionNode`), so pass `t` as a prop or use context directly
4. For `FeatListItem` — it receives `quickActionLabel` as a prop with default `"Select"`. Change default to use a translated value by accepting `t` or making the default empty and letting callers pass `t("feats.select")`

### Files changed
- `src/i18n/en.ts` — add ~22 keys
- `src/components/FeatListItem.tsx`
- `src/components/GMPlayerList.tsx`
- `src/components/PlayerListSheet.tsx`
- `src/components/WikiSectionTree.tsx`
- `src/components/CharacterListItem.tsx`
- `src/pages/Home.tsx`
- `src/pages/Dashboard.tsx`

