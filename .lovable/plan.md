# Standardize the Character Details view

Today there are two standard character UIs: `CharacterListItem` (compact card) and `CharacterSheet` (edit). We'll add a third standard component — a read-only "details" view — wire the compact card to open it on click, and move edit + delete into the details header.

## New component: `CharacterDetails`

`src/components/CharacterDetails.tsx` — read-only, dialog-friendly, fully self-contained.

Props:
```ts
{ characterId: string }
```

Renders:
- Large portrait (clickable → `PortraitViewer`), name, description.
- Feat list using the same data path as `CharacterListItem` (`charRow.feats` + `getFeatById`), but each feat is expanded:
  - Title + level/free badge
  - One-liner (`meta.description`) using the existing `FeatDetailsDisplay` so wiki links, prerequisites, special, etc. render the same way they do in the feat library.
  - Subfeats listed below with their own one-liner.
- Specialities rendered if present.

Same component everywhere — players reading their sheet in `PlayGame`, GM peeking from `GMPlayerList`/`PlayerListSheet`, owner browsing from `Dashboard`.

## New wrapper: `CharacterDetailsDialog`

Opens `CharacterDetails` in a `Dialog`. Header has, before the close X:

- `✏ Edit` — visible if `canEdit`. Swaps the dialog body to `CharacterSheet` (same dialog, no second modal). "Done" returns to details.
- `🗑 Delete` — visible if `canDelete`. Confirm via `AlertDialog`, then soft-delete: `upsertRow("characters", { ...row, deleted_at: now })` + `triggerPush()` + close dialog.

Dialog is always dismissable (Escape, click-outside, X), matching the existing edit dialog. Follows the project's fullscreen-dialog rules.

Props: `{ characterId; open; onOpenChange; canEdit?; canDelete? }`.

## Compact card — `CharacterListItem`

- Add `onView?: () => void` prop.
- Whole card becomes clickable when `onView` is set (calls it on click).
- **Remove** the `actions` slot — no more pencil on the card, no delete on the card. Edit + delete now live exclusively inside the details dialog.
- Add a single view affordance on the right (alchemical glyph, no Lucide) as a visual hint that the card opens details. Clicking it just calls `onView` too.

## Wire-up at call sites

Every surface renders the compact card → click opens `CharacterDetailsDialog`. Permissions per surface:

| Surface | `canEdit` | `canDelete` |
|---|---|---|
| `Dashboard` (owner) | true | true |
| `PlayGame` (player, own char) | true | false |
| `GMPlayerList` (GM viewing players) | true | false |
| `PlayerListSheet` (GM viewing players) | true | false |

`PlayerListSheet` loses its inline edit-in-place; all four surfaces behave identically through the dialog.

## Soft delete

No schema change — `characters.deleted_at` is already filtered in `GMPlayerList`. Add the same `!c.deleted_at` filter to character lists in:

- `Dashboard`
- `PlayGame` (character picker)
- `PlayerListSheet`

Realtime push needs no extra work — `deleted_at` is just another column update.

## Files touched

- New: `src/components/CharacterDetails.tsx`, `src/components/CharacterDetailsDialog.tsx`
- Edit: `src/components/CharacterListItem.tsx` (clickable + view glyph, drop actions slot)
- Edit: `src/pages/Dashboard.tsx`, `src/pages/PlayGame.tsx`, `src/components/GMPlayerList.tsx`, `src/components/PlayerListSheet.tsx` (use new dialog, add `deleted_at` filter)
- i18n: new keys (`character.view`, `character.edit`, `character.delete`, `character.delete.confirmTitle`, `character.delete.confirmBody`, `character.delete.cta`) in `src/i18n/en.ts` + `fr.ts`.
