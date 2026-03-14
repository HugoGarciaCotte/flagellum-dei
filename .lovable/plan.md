

## Full-Screen Scenario Editor

When a scenario is expanded for editing, replace the collapsible inline view with a full-screen overlay layout.

### Layout

```text
┌─────────────────────────────────────────────┐
│ [← Back]   Title (input)      Level (input) │  ← single row
├─────────────────────────────────────────────┤
│ Description (textarea, full width)          │  ← second row
├─────────────────────────────────────────────┤
│ [Insert Tag ▾]                    [Save ✓]  │  ← toolbar
│                                             │
│  Content textarea (flex-1, fills rest)      │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

### Changes

**`src/components/ScenarioEditorPanel.tsx`**

1. When `expandedId` is set, render a full-screen editor view instead of the collapsible list:
   - Use `fixed inset-0 z-50 bg-background flex flex-col` to overlay the entire screen
   - Header row: back button (sets `expandedId = null`), Title `OverrideField` inline, Level `OverrideField` on the right — all on one line
   - Second row: Description `OverrideField` full width
   - Rest: `ContentEditor` with `flex-1` so the textarea fills remaining space

2. The scenario list remains underneath but is hidden by the overlay. Closing returns to the list.

3. Modify `OverrideField` to accept an optional `inline` prop to render without the label stacking (label hidden, just the input + save button) for the compact header row. Or simply render Title/Level directly with inline inputs rather than using `OverrideField`.

4. Make the `ContentEditor` textarea use `flex-1` and `h-full` instead of `min-h-[200px]` when in full-screen mode.

