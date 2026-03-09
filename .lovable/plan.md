

## Revive One-Liner Descriptions from Parseable Fields

The `feat_one_liner` metadata already exists in feat content (parsed by `parseEmbeddedFeatMeta`), but it's not being surfaced to the UI. The fix is to extract descriptions from the metadata and pass them through to `FeatListItem`.

### Changes

#### 1. `src/components/CharacterFeatPicker.tsx`

- **Expand `metaMap`** to parse ALL feats, not just Archetypes. Currently it only parses Archetype feats (line 123 filters by `categories.includes("Archetype")`). Remove that filter so every feat gets parsed.
- **Derive a `descriptionMap`** from `metaMap`: `Map<string, string>` mapping feat ID → one-liner description (from `meta.description`).
- **Pass `description` to `FeatListItem`** in both the picker view (line 778) and the main assigned-feats view — set `feat.description` by spreading: `{ ...feat, description: descriptionMap.get(feat.id) ?? undefined }`.

#### 2. No other files need changes

`FeatListItem` already accepts and renders `description` on the feat object. `parseEmbeddedFeatMeta` already extracts `feat_one_liner` into `.description`. This is purely wiring.

