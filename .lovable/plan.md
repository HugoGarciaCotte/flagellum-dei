

## Fix Feat Content Visibility in Picker & Character Sheet

### Problem

Every `FeatListItem` render in `CharacterFeatPicker.tsx` passes `description: null`, which hides:
1. The collapsed one-line preview text
2. The expanded description paragraph

The `FeatDetailsDisplay` (which shows parsed wiki content — description, prerequisites, special, full content) does render when expanded because it reads from `feat.content`, but the AI-generated `description` field is explicitly nulled out everywhere.

Additionally, on mobile the expanded content can be hard to read inside the compact card layout, especially in the picker's scrollable list.

### Changes

#### 1. `src/components/CharacterFeatPicker.tsx` — Stop nulling descriptions

**Picker view (line ~753):** Change `{ ...feat, description: null }` → `{ ...feat }` so the collapsed preview shows the AI-generated description and the expanded view shows it too.

**Assigned feats (lines ~801, ~857):** Same change — stop overriding `description` to null.

This alone fixes the core issue: expanding a feat now shows description + full `FeatDetailsDisplay` content.

#### 2. `src/components/FeatListItem.tsx` — Better expanded layout

- When expanded, show the `FeatDetailsDisplay` fields (description, prerequisites, special, blocking, full content) more prominently instead of hiding full content behind a `<details>` collapse.
- Show the parsed description and prerequisites directly (already works via `FeatDetailsDisplay`).

#### 3. `src/components/FeatDetailsDisplay.tsx` — Remove the nested `<details>` collapse

Currently the "Full content" section is hidden behind a nested `<details>` toggle. For player use, show all parsed fields directly without the extra click. Remove the `<details>` wrapper and render the full HTML inline. This means when a player expands a feat, they immediately see everything: description, prerequisites, special, incompatibilities, and the full wiki content.

### Summary of actual edits

| File | Change |
|---|---|
| `CharacterFeatPicker.tsx` | Remove `description: null` from all 3 `FeatListItem` renders (~lines 753, 801, 857) |
| `FeatDetailsDisplay.tsx` | Replace `<details><summary>Full content</summary>...</details>` with direct inline render |

Two small, targeted changes that make feat content fully visible both when picking and when viewing assigned feats.

