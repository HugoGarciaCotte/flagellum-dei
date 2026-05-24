## Goal

Add a per-feat "exhaustion" mechanic: feats can be marked Used, display an exhausted/used label everywhere, and auto-recharge based on how many scenarios the player has joined since use.

## 1. Data model — exhaustion type (feat definition)

Add a new field to `FeatMeta` in `src/data/feats.ts`:

```ts
type ExhaustionType =
  | "infinite"          // default — no Use button
  | "once_forever"      // permanent once used
  | "once_per_scenario"
  | "once_per_2_scenarios"
  | "once_per_3_scenarios";

interface FeatMeta {
  ...
  exhaustion?: ExhaustionType;
}
```

Treat missing/`infinite` as default. Helper `getFeatExhaustion(feat) → ExhaustionType`.

### Seed the four defaults in `src/data/feats-data.json`:

- `⭐ Faith` → `once_per_2_scenarios`
- `⛧ Dark Faith` → `once_per_scenario`
- `⭐ Miracle` → `once_forever`
- All other feats in the `Prowess` category → `once_per_scenario`

Written into each feat's `meta.exhaustion` field directly in the JSON (Miracle wins over the Prowess default).

## 2. Per-character exhaustion state

Stored on each entry in `character.feats[i]` (the JSONB doc on `characters`) — no schema migration needed. Added fields:

```ts
{
  ...existing,
  exhausted_at?: string | null;          // ISO timestamp when "Use" was clicked
  exhausted_scenario_id?: string | null; // scenario id at time of use (null if not in a game)
  used_forever?: boolean;                // set true for once_forever after Use
}
```

Recharge clears all three.

## 3. Auto-recharge logic

New helper `src/lib/featExhaustion.ts`:

```
isExhausted(featEntry, exhaustionType, userScenarioHistory) → boolean
labelKey(exhaustionType, isExhausted, used_forever) → "exhausted" | "used" | null
```

- `infinite` → never exhausted, no Use button.
- `once_forever` → exhausted iff `used_forever === true`. Label = `(used)`.
- `once_per_N_scenarios` → exhausted iff `exhausted_at` is set AND the number of **distinct scenarios the player has joined strictly after** `exhausted_scenario_id` (ordered by `joined_at`) is `< N`. The exhausting scenario itself counts as scenario 1 of N; joining the Nth subsequent scenario clears it. Label = `(exhausted)`.

`userScenarioHistory` is computed from local `game_players` rows for the character's `user_id`, joined to local `games` rows to get `scenario_id` + `joined_at`, deduped by scenario_id keeping earliest join.

A new hook `useUserScenarioHistory(userId)` wraps `useLocalRows("game_players", { user_id })` + `useLocalRows("games")` and returns the ordered scenario list.

Manual **Recharge** button always available (even on `infinite`/`once_forever`) — clears the state.

## 4. UI — `FeatListItem`

Extend props:

```ts
exhaustionType?: ExhaustionType;
isExhausted?: boolean;       // computed by caller
isUsedForever?: boolean;
onUse?: () => void;           // shown only in non-compact mode
onRecharge?: () => void;      // shown only in non-compact mode
```

Behavior:

- Always (compact AND non-compact): append ` (exhausted)` or ` (used)` after `feat.title` when `isExhausted` is true. Use a muted/destructive tone styling.
- Non-compact only: render a **Use** button (when not exhausted and `exhaustionType !== "infinite"`) and a **Recharge** button (when exhausted, OR always as an admin escape — per the spec "regardless there should always be a button to recharge"). Place them next to the existing Info button.
- Compact: never render Use/Recharge.

## 5. Wire callers

**`CharacterDetails.tsx`** (detailed read-only view): pass `compact={false}` for the main feat entries (subfeats stay compact), supply `onUse`/`onRecharge` that mutate `character.feats[i]` via `upsertRow("characters", ...)` + `triggerPush`. Look up exhaustion from feat meta + history.

**`CharacterFeatPicker.tsx`** (edit view inside `CharacterSheet`): same — render the assigned-feat `FeatListItem` with `compact={false}` for the level row and free-feat row, pass `onUse`/`onRecharge` mutating the same doc. Subfeats stay compact (no use button on subfeats).

**Picker dialog and all subfeat displays**: stay compact; show label only when applicable (subfeats can technically be exhausted too if their feat def has an exhaustion type — render label, no buttons).

Current scenario id (needed to record `exhausted_scenario_id`): read the active game for `mode === "player"` from `game_players` where `user_id = current user` and find the matching game's `scenario_id`. For GM editing a player's feats, use the GM's currently hosted game scenario. Best abstraction: a `useCurrentScenarioId(characterUserId)` helper that returns the scenario id of the most recent non-deleted game the user is part of.

## 6. Feat editor — `FeatEditorPanel.tsx`

Add an `exhaustion` field to:

- `META_FIELDS` (typed)
- The editable row UI: a `<Select>` with the 5 options, default "Infinite Use", saving via existing `saveField(feat.id, "exhaustion", value)` / `revertField`. Place it in the meta-fields block.
- Export shape in `handleDownloadAndClear`: include `exhaustion` in the `meta` object.

Not added to `GENERATABLE_FIELDS` (AI can't infer this).

## 7. i18n keys

Add to the `feats.*` and `adminFeats.*` dictionaries:

- `feats.use` = "Use"
- `feats.recharge` = "Recharge"
- `feats.exhaustedTag` = "(exhausted)"
- `feats.usedTag` = "(used)"
- `adminFeats.fieldExhaustion` = "Exhaustion"
- `adminFeats.exhaustion.infinite` / `.onceForever` / `.oncePerScenario` / `.oncePer2Scenarios` / `.oncePer3Scenarios`

FR translations alongside.

## Technical notes / out of scope

- No DB migration. `character.feats` is JSONB so new keys flow through `syncManager` and `feat_overrides.value` is JSONB so `meta.exhaustion` round-trips automatically.
- No change to `character_feats` legacy table (compatibility path remains untouched).
- The Miracle/Prowess/Faith/Dark Faith defaults are hardcoded in `feats-data.json` so they ship offline; admins can still override per-feat from the editor.
- "Exhausted timer": the user-visible signal is the `(exhausted)` label until the join-count threshold is reached; we don't render a separate countdown widget. (If you want a textual hint like "recharges in 2 scenarios", say so and I'll add it to the non-compact view.)
