

## Improve Admin Feat Management Panel

### Problem
The current admin panel shows feats in a compact table with tiny icon buttons. It's hard to see how each feat is configured (description, categories, subfeats). Regenerating AI content requires clicking individual small buttons per feat.

### Changes — `src/components/ManageFeats.tsx`

**1. Add "Regenerate All AI" bulk action**
- Add a button in the CardHeader: "Regenerate All AI" that loops through all feats and sequentially calls both `regenerate-description` and `regenerate_subfeats` for each.
- Show a progress indicator (e.g., "Processing 3/42...") during the bulk operation.
- Add state: `bulkRegenerating: boolean`, `bulkProgress: { current: number; total: number } | null`.

**2. Replace compact table with expandable card list**
- Replace the `<Table>` with a list of expandable rows/cards per feat.
- **Collapsed view** shows:
  - Title + category badges
  - Description (or "No description" in muted text)
  - Status indicators: checkmark/warning icons for description present, subfeats configured
- **Expanded view** (click to toggle) shows:
  - Full description
  - Subfeat configuration detail (the existing `renderSubfeatsDetail` but more prominent)
  - Content preview (first few lines, truncated)
  - Per-feat action buttons: Edit, Regenerate Description, Regenerate Subfeats, Delete

**3. Add a "Regenerate All" button per feat**
- Single button that regenerates both description AND subfeats for one feat in sequence, replacing the two separate icon buttons.

### Files changed
- `src/components/ManageFeats.tsx`

