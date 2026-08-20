# Notes and Inventory on characters

Add a free-text "Notes and Inventory" field to every character, editable on the character sheet and visible in the read-only details view.

## Behaviour

- New multi-line free text field, no length limit enforced beyond sane UI sizing.
- Empty by default for existing characters; nothing is migrated or lost.
- Editable by the character owner and by the GM (same permissions as name/description today).
- Saved through the existing local-first flow: typing marks the sheet dirty, "Save changes" writes locally and pushes to the backend. Works offline.
- Shown in the character details view only when non-empty, with line breaks preserved.

## Changes

1. Database migration: add a nullable `notes` text column to `characters`. No RLS or grant changes needed — existing character policies already cover the column.
2. `src/components/CharacterSheet.tsx`: add a labelled `Textarea` under the description, wired to the same dirty/save logic (initialize on character change, don't clobber in-progress typing, persist via `upsertRow` + `triggerPush`).
3. `src/components/CharacterDetails.tsx`: render a "Notes and Inventory" block after the feats section when `notes` is set, using `whitespace-pre-wrap`.
4. Translations: add `character.notes.label` / `character.notes.placeholder` / `character.details.notes` keys to the static dictionaries (EN + FR), following the `t('screen.section.purpose')` convention.

## Notes

Character list items stay unchanged — notes are intentionally not shown in the compact list to avoid clutter.
