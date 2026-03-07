

## Extract Manage Feats to Separate Admin Screen

Move the heavy `ManageFeats` component to its own route (`/admin/feats`) and replace it on the main admin page with a simple link card.

### Changes

1. **New page `src/pages/AdminFeats.tsx`**
   - Owner-gated page (same pattern as `Admin.tsx`) with `PageHeader` showing "Manage Feats" and a back button to `/admin`
   - Renders `<ManageFeats />` as the main content

2. **`src/pages/Admin.tsx`**
   - Remove `ManageFeats` import
   - Replace `<ManageFeats />` with a `Card` containing a brief description and a `Button` / link navigating to `/admin/feats`

3. **`src/App.tsx`**
   - Add route: `<Route path="/admin/feats" element={<AdminFeats />} />`
   - Import `AdminFeats`

