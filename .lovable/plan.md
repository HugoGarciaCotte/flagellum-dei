

## Show Raw Content in Feat Details

When a feat is expanded in the admin panel, add a "Raw Content" section below the existing "Content" block that displays `f.raw_content`. This lets you see and manually edit the parseable fields.

### Changes in `src/components/ManageFeats.tsx`

1. **Add raw_content display** (after the Content `<pre>` block, ~line 494): Add a new section showing `f.raw_content` in a monospace `<pre>` block, similar to how `content` is displayed. Only shown when `raw_content` exists.

2. **Update Edit dialog to edit raw_content**: 
   - Add `raw_content` to the `FormData` type
   - Add a second `<Textarea>` in the edit dialog labeled "Raw Content (parseable fields live here)"
   - Update `openEdit` to populate `raw_content` from the feat
   - Update `saveMutation` to include `raw_content` in the upsert payload

This way you can view the raw wiki markup with parseable comment tags, and edit them by hand if needed.

