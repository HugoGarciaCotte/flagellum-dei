

## Move Feat Manager Buttons to Top Bar, Remove Card Wrapper

The `ManageFeats` component currently wraps everything in a `Card` with buttons in the `CardHeader`. Instead, expose the action buttons so `AdminFeats` can place them in the `PageHeader`, and render the feat list directly without the Card wrapper.

### Changes

1. **`src/components/ManageFeats.tsx`**
   - Accept an optional `renderActions` prop: a render function that receives the action buttons JSX and the progress bar JSX, so the parent can place them elsewhere
   - When `renderActions` is provided: skip the `Card`/`CardHeader` wrapper entirely, render just the list (no `max-h-[36rem]` constraint — let it fill the view) and dialogs
   - When not provided: keep current behavior (backward compat, though currently unused elsewhere)
   - Specifically: remove the `Card`, `CardHeader`, `CardContent` wrapper; render feat list in a full-height scrollable container

2. **`src/pages/AdminFeats.tsx`**
   - Pass action buttons (Check AI, Generate All, New) as `rightActions` to `PageHeader`
   - This requires `ManageFeats` to expose the buttons via a pattern — simplest: refactor `ManageFeats` to accept a `headerRef` or use a render-prop/callback pattern

**Simpler approach**: Extract the buttons out of `ManageFeats` and into `AdminFeats`, but that would require lifting a lot of state. Instead:

**Chosen approach**: Have `ManageFeats` accept a `renderHeader` prop. If provided, it calls `renderHeader(buttonsJSX, progressJSX)` and the parent uses a React portal or just places them. Actually even simpler:

**Final approach**:
1. **`src/components/ManageFeats.tsx`**: 
   - Remove the `Card`/`CardHeader`/`CardContent` wrapper entirely
   - Move the action buttons into a top `div` 
   - Remove `max-h-[36rem]` so the list fills the view
   - Accept a `headerSlot?: (actions: ReactNode, progress: ReactNode) => void` ref-callback that the parent can use to grab the actions

Actually the simplest clean approach:

1. **`src/components/ManageFeats.tsx`**:
   - Remove `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` wrapper
   - Render a flat fragment: action buttons row at top, then the list, then all dialogs
   - Remove `max-h-[36rem] overflow-y-auto` — let the page scroll naturally
   - The buttons row gets a `className` prop or is conditionally hidden via a `hideActions` prop

2. **`src/pages/AdminFeats.tsx`**:
   - Move the buttons into `PageHeader`'s `rightActions` — but this requires the button click handlers from ManageFeats...

The cleanest approach without major refactoring: **Just remove the Card wrapper and max-height from ManageFeats, keep buttons inside ManageFeats but render them sticky/inline at the top.** The `PageHeader` in `AdminFeats` already has the title and back button. ManageFeats renders its own toolbar row (no card) then the list fills the remaining space.

### Final Plan

1. **`src/components/ManageFeats.tsx`** (lines 354-411):
   - Remove `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` wrappers
   - Keep the buttons row as a `div` with flex layout
   - Remove `max-h-[36rem] overflow-y-auto` from the list container — use `flex-1 overflow-y-auto` instead
   - Wrap the whole thing in a flex column that fills available height

2. **`src/pages/AdminFeats.tsx`**:
   - Change `<main>` to use `flex-1 overflow-hidden` so ManageFeats can fill the remaining viewport
   - Make the outer div use `flex flex-col h-screen`

