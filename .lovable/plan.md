

## Plan: Rethink content editor with proper cursor-aware insertion

### Problem

The current architecture has a fundamental issue: the `ContentField` component manages its own local state, but `insertBackgroundTagWithUrl` bypasses it by calling `saveField` directly with a reconstructed string. This means:
1. If the user has unsaved edits in the textarea, the insertion overwrites them (uses `getEffective` which reads the last-saved value, not the current textarea content)
2. Cursor position is likely lost when clicking toolbar buttons outside the textarea
3. The insert state (`insertMode`, `bgMode`, etc.) is global but rendered per-scenario

### Solution

**Refactor `ContentField` to expose an `insertAtCursor(text: string)` imperative method** via `useImperativeHandle`. All insertion logic routes through this method, which:
- Reads the current local text and cursor position from the textarea
- Splices the tag in at the cursor
- Updates local state (so the save button appears)
- Restores cursor position after the tag

**Move the Insert Tag toolbar inside `ContentField`** so the toolbar and textarea share the same component scope — no need for cross-component ref wiring.

### Changes

#### 1. `ContentField` — becomes a full content editor

Merge the Insert Tag dropdown + background panel into `ContentField` (rename to `ContentEditor`). It receives:
- `value`, `saving`, `onSave`, `scenarioId` (as before)
- `onUpload`, `onAiGenerate` callbacks for async operations that need parent-level logic

The component internally:
- Manages its own `local` text state and textarea ref
- Has an `insertAtCursor(text)` helper that splices text at `selectionStart` and updates local state
- Renders the Insert Tag dropdown + sub-panels above the textarea
- The toolbar buttons call `insertAtCursor` directly — no round-trip through parent

#### 2. Move async handlers (upload, AI generate) to accept a callback

`handleFileUpload` and `handleAiGenerate` currently call `insertBackgroundTagWithUrl` at the end. Instead, they'll accept an `onResult(url: string)` callback. `ContentEditor` passes its own `insertAtCursor` wrapper as this callback.

#### 3. Preserve cursor on toolbar interaction

Add `onMouseDown={(e) => e.preventDefault()}` to toolbar buttons so clicking them doesn't blur the textarea and lose the selection.

### Files changed
- `src/components/ScenarioEditorPanel.tsx` — restructure ContentField into ContentEditor with integrated toolbar; refactor insertion logic

