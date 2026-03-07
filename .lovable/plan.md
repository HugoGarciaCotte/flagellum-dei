

## Plan: Scenario CRUD Management in Admin Panel

### Overview
Add a "Manage Scenarios" section to the Admin page with the ability to list, create, edit, and delete scenarios directly.

### Database Changes
Need RLS policies for INSERT, UPDATE, DELETE on `scenarios` table for owner/admin roles. Currently only SELECT is allowed.

**Migration SQL:**
- Add INSERT policy: owners/admins can insert
- Add UPDATE policy: owners/admins can update
- Add DELETE policy: owners/admins can delete

### UI Changes in `src/pages/Admin.tsx`

Add a second Card below the existing "Import from Wiki" card:

**"Manage Scenarios" section:**
1. **Scenario list** — fetch all scenarios, display in a table with title, description preview, and action buttons (Edit, Delete)
2. **Create button** — opens a Dialog with fields: title (input), description (textarea), content (textarea for raw wikitext). Inserts via `supabase.from("scenarios").insert()`
3. **Edit button** — opens the same Dialog pre-filled with existing data. Updates via `.update()`
4. **Delete button** — AlertDialog confirmation, then `.delete()`

Use `useQuery` for fetching scenarios and `useMutation` + `queryClient.invalidateQueries` for create/update/delete.

### Files to modify

| File | Change |
|---|---|
| **Migration** | Add INSERT, UPDATE, DELETE RLS policies on `scenarios` for users with owner/admin role |
| `src/pages/Admin.tsx` | Add Manage Scenarios card with list table, create/edit Dialog, delete AlertDialog |

