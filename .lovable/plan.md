

## Add Preview Step to Single Feat Push to Wiki

Currently, the "Push to Wiki" button on each feat in ManageFeats.tsx executes immediately without showing what will change. The edge function already supports `mode: "preview"` — we just need to use it.

### Changes to `src/components/ManageFeats.tsx`

1. **Add state** for a push preview dialog: `pushPreviewFeat` (the feat being previewed) and `pushPreviewResult` (the preview response from the edge function).

2. **Change `handlePushToWiki`** to call `mode: "preview"` first instead of `mode: "execute"`. If the result is "unchanged", show a toast saying already in sync. If "modified" or "new", open a confirmation dialog showing the status. If "not_found" or "error", show appropriate toast.

3. **Add a confirmation dialog** that shows the feat title and its diff status (new/modified/delete), with "Confirm Push" and "Cancel" buttons.

4. **Add `handleConfirmPush`** that calls `mode: "execute"` for the previewed feat, then closes the dialog and shows a success/error toast.

This reuses the existing `push-wiki-feats` edge function — no backend changes needed.

