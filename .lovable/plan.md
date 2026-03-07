

## Always-Open Note Field on Feats

### Problem
The current note UI uses a Pencil icon button that must be clicked to reveal the input field. This is confusing — users don't realize they can add notes.

### Solution
Replace the edit-button pattern with an always-visible inline input field for the note. Remove the `editingNoteId` toggling logic entirely.

### Changes

#### `src/components/FeatListItem.tsx`
- Remove the `note` and `noteEditor` props.
- Add a new `noteValue?: string`, `onNoteChange?: (value: string) => void`, `onNoteBlur?: () => void` props.
- Render a small always-visible `Input` inline (after the title/chevron area) when `onNoteChange` is provided. Show the input with the current value, placeholder "note...".

#### `src/components/CharacterFeatPicker.tsx`
- Remove `editingNoteId`, `noteValue` state, `startEditingNote`, `noteInputRef`.
- Track notes locally per character-feat ID using a `Map` or `Record` state initialized from fetched data.
- Pass `noteValue` and `onNoteChange` / `onNoteBlur` (which triggers the save mutation) directly to each `FeatListItem`.
- On blur, call `updateNoteMutation` to persist.
- Both level-feat and free-feat `FeatListItem` usages get the same treatment.

### Files Changed
1. **`src/components/FeatListItem.tsx`** — Replace note/noteEditor with always-visible input props
2. **`src/components/CharacterFeatPicker.tsx`** — Remove edit-note toggling, use inline always-open inputs

