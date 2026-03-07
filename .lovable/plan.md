

## Create a Standard CharacterListItem Component

### Overview
Create a reusable `CharacterListItem` component that displays the character name, description, and a condensed bullet-point list of their feats (with subfeats nested underneath). Use it in the Dashboard and anywhere else characters are listed.

### New File: `src/components/CharacterListItem.tsx`

- Accepts `character` (id, name, description), `actions` (edit/delete buttons), and optional `onClick`.
- Fetches the character's feats via a query joining `character_feats` → `feats` (to get feat titles), and `character_feat_subfeats` → `feats` (to get subfeat titles).
- Renders inside a `Card`:
  - **Header**: Character name + actions (edit/delete icons)
  - **Description**: Below name, muted text
  - **Feat list**: Condensed bullet list (`ul` with `list-disc`), each feat as `• Feat Name`. Subfeats indented underneath as `◦ Subfeat Name`.
  - If no feats, show subtle "No feats" text.

### Query Shape
```typescript
const { data } = await supabase
  .from("character_feats")
  .select("id, feat_id, feats(title), character_feat_subfeats(subfeat_id, feats(title))")
  .eq("character_id", characterId)
  .order("level");
```

### Update: `src/pages/Dashboard.tsx`
Replace the inline character card rendering (lines 266-282) with `<CharacterListItem>`, passing the edit/delete action buttons as props.

### Files Changed
1. **`src/components/CharacterListItem.tsx`** — New component
2. **`src/pages/Dashboard.tsx`** — Use `CharacterListItem` in the "My Characters" section

