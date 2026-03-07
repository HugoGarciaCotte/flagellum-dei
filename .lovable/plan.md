

## Plan: Add Dry-Run Preview Before Wiki Import

### Approach
Split the import into two steps: **preview** (dry-run) and **confirm** (actual import).

### 1. Add `mode` parameter to edge function
The edge function `import-wiki-scenarios/index.ts` will accept a JSON body `{ mode: "preview" | "execute" }`.

- **Preview mode**: Fetches wiki pages, checks each title against the `scenarios` table, and returns a list of items categorized as `new` or `modified` -- but writes nothing to the DB.
- **Execute mode**: Current behavior (upserts).

The preview response shape:
```json
{
  "items": [
    { "title": "Scenario A", "status": "new" },
    { "title": "Scenario B", "status": "modified" },
    { "title": "Scenario C", "status": "unchanged" }
  ],
  "total": 3
}
```

### 2. Update Admin.tsx with two-step flow

**New state**: `preview` (holds the preview items list), plus `importing` for loading states.

**Flow**:
1. User clicks "Check for Updates" -- calls the edge function with `mode: "preview"`, displays a table/list showing each scenario with a badge (New / Modified / Unchanged).
2. User reviews the list, then clicks "Confirm Import" -- calls the edge function with `mode: "execute"`.
3. A "Cancel" button clears the preview and returns to the initial state.

**UI**: Use the existing Table component + Badge component to show the preview list. Color-code: green for new, yellow for modified, gray for unchanged.

### Files to modify
| File | Change |
|---|---|
| `supabase/functions/import-wiki-scenarios/index.ts` | Add `mode` param; in preview mode, return items list without DB writes |
| `src/pages/Admin.tsx` | Two-step UI: preview list with confirm/cancel buttons |

