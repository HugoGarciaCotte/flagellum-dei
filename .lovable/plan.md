

## Add structured JSON metadata to feats

### Problem

Currently, feat metadata (description, prerequisites, subfeats, specialities, blocking, etc.) is extracted at runtime from raw wikitext using two separate parsers:
- `parseEmbeddedFeatMeta()` — parses `<!--@ ... @-->` HTML comment tags from `raw_content`
- `parseFeatFields()` — parses `{{Feats | field = value }}` MediaWiki templates from `content`

Every component that needs metadata must call these parsers redundantly. The data model is fragile and the parsing logic is scattered.

### Solution

Add an optional `meta` JSON field to each feat in the data file. When present, it replaces all runtime parsing. When absent (the default for now), the existing parsers remain the fallback. You can port feats one by one.

### New `FeatMeta` interface

```typescript
export interface FeatMeta {
  description?: string;
  prerequisites?: string;
  special?: string;
  specialities?: string[];
  subfeats?: SubfeatSlot[];
  unlocks_categories?: string[];
  blocking?: string[];
  synonyms?: string;
}
```

### Data shape change

```typescript
export interface Feat {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
  meta?: FeatMeta | null;  // ← NEW: structured metadata, optional
}
```

In `feats-data.json`, feats without structured data remain unchanged. Ported feats get a `"meta": { ... }` key.

### Unified accessor: `getFeatMeta(feat)`

A single function in `src/data/feats.ts` that returns `FeatMeta` for any feat:

```typescript
export function getFeatMeta(feat: Feat): FeatMeta {
  if (feat.meta) return feat.meta;
  // Fallback: parse from wikitext
  const embedded = parseEmbeddedFeatMeta(feat.raw_content || feat.content);
  const fields = parseFeatFields(feat.content);
  return {
    description: embedded.description ?? fields.description ?? undefined,
    prerequisites: embedded.prerequisites ?? fields.prerequisites ?? undefined,
    special: fields.special ?? undefined,
    specialities: embedded.specialities ?? undefined,
    subfeats: embedded.subfeats ?? undefined,
    unlocks_categories: embedded.unlocks_categories ?? undefined,
    blocking: embedded.blocking ?? undefined,
    synonyms: fields.synonyms ?? undefined,
  };
}
```

### Consumer changes (6 files)

All components that currently call `parseEmbeddedFeatMeta` or `parseFeatFields` directly will switch to `getFeatMeta(feat)`:

| File | Current | New |
|---|---|---|
| `CharacterFeatPicker.tsx` | Builds `metaMap` by calling `parseEmbeddedFeatMeta` on every feat | Call `getFeatMeta(feat)` — same map, one function |
| `CharacterCreationWizard.tsx` | Same `metaMap` pattern | Same change |
| `FeatDetailsDisplay.tsx` | Calls both `parseEmbeddedFeatMeta` + `parseFeatFields` | `getFeatMeta(feat)` for tooltips; main display still renders `content` HTML |
| `WikiLinkedText.tsx` | Calls both parsers in hover card | `getFeatMeta(feat)` |
| `WikiSectionTree.tsx` | Calls `parseFeatFields` in tooltip | `getFeatMeta(feat)` |
| `ManageFeats.tsx` | Calls `parseEmbeddedFeatMeta` for each feat | `getFeatMeta(feat)` |

### Files summary

| Action | Files |
|---|---|
| **Edit** | `src/data/feats.ts` (add `FeatMeta` interface + `getFeatMeta` function + update `Feat` type) |
| **Edit** | `src/data/feats-data.json` (no changes now — `meta` field is optional, added per-feat as you port them) |
| **Edit** | `CharacterFeatPicker.tsx`, `CharacterCreationWizard.tsx`, `FeatDetailsDisplay.tsx`, `WikiLinkedText.tsx`, `WikiSectionTree.tsx`, `ManageFeats.tsx` — replace direct parser calls with `getFeatMeta` |
| **Keep** | `parseEmbeddedFeatMeta.ts` and `parseFeatContent.ts` stay as fallback parsers, used internally by `getFeatMeta` |

### Migration path

Once all feats have `meta` populated, `parseEmbeddedFeatMeta` and `parseFeatFields` can be deleted entirely and `getFeatMeta` simplified to just return `feat.meta`.

