

## Remove redundant edit screen after character creation

**Problem**: In `Dashboard.tsx`, when the character creation wizard completes, `onCreated` sets `editingCharId` to the new character's ID (line 279), which immediately opens the CharacterSheet editor. This is redundant since the wizard's final step already covers name, description, and portrait.

**Fix**: In `src/pages/Dashboard.tsx` line 279, remove `setEditingCharId(charId)` so the wizard simply closes and returns to the dashboard, matching the PlayGame behavior.

```tsx
// Before
onCreated={(charId) => {
  setNewCharDialogOpen(false);
  setEditingCharId(charId);  // ← remove this
}}

// After
onCreated={() => {
  setNewCharDialogOpen(false);
}}
```

One small change, one file.

