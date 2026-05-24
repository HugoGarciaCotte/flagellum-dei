## The inconsistency, mapped

Right now back/close uses **five different patterns** depending on where you are:

| Surface | Currently uses | Example |
|---|---|---|
| Top-level pages (`/admin`, `/admin/feats`, `/admin/scenarios`, `/admin/translations`) | `←` ArrowLeft in `PageHeader.leftAction`, navigates to a hardcoded parent | `AdminFeats.tsx:33`, `Admin.tsx:38` |
| Game pages (`/play`, `/host`) | `←` ArrowLeft that always goes to `/` | `PlayGame.tsx:156`, `HostGame.tsx:242` |
| `CharacterDetailsDialog` (fullscreen) | `←` on the left **and** `✕` on the right, both close the dialog | `CharacterDetailsDialog.tsx` |
| `CharacterCreationWizard`, `CharacterFeatPicker` | `←` ArrowLeft used as a step-back (not dialog-close) | `CharacterCreationWizard.tsx:554/693`, `CharacterFeatPicker.tsx:682` |
| Sub-panels (`AiImprovePanel`, `BackgroundInsertDialog`, `PortraitViewer`, sub-flows in `PlayGame`) | `✕` X icon | `AiImprovePanel.tsx:184`, `PlayGame.tsx:309`, `PortraitViewer` |

Two real problems:
1. **Same glyph, different meaning** — `←` sometimes means "go to parent route", sometimes "close dialog", sometimes "previous wizard step".
2. **Redundant controls** — `CharacterDetailsDialog` shows both `←` and `✕` for the same action.

## The rule (one sentence)

> **`←` means "go back one level in the hierarchy" (route or wizard step). `✕` means "dismiss this overlay". Never both on the same surface.**

Concretely:

| Surface type | Left | Right | Action |
|---|---|---|---|
| **Route page** (anything rendered by a `<Route>`) | `←` ArrowLeft | — | Go to parent route (or `navigate(-1)` fallback) |
| **Fullscreen / modal dialog** (covers the whole screen, no parent route visible) | — | `✕` X | Close dialog |
| **Multi-step wizard** inside a dialog | `←` ArrowLeft (step ≥ 2) | `✕` X | Left = previous step; Right = abort whole wizard |
| **Inline panel** (side sheet, popover, embedded form) | — | `✕` X | Close panel |

This kills the "two buttons for the same thing" problem in `CharacterDetailsDialog` and gives every surface exactly one obvious exit.

## Implementation

### 1. New shared primitive — `src/components/nav/BackButton.tsx` and `CloseButton.tsx`

Two tiny wrappers around the Lucide `ArrowLeft` / `X` icons in a ghost `Button` with `h-8 w-8`, `text-muted-foreground` → `hover:text-foreground`. They standardize size, color, hover, aria-label, and tooltip. Every surface imports these instead of hand-rolling its own button. (Pattern already proven by the `HeaderIconButton` we just shipped in `CharacterDetailsDialog`.)

Props:
- `BackButton`: `to?: string` (explicit parent) or falls back to `navigate(-1)`; optional `onClick` override for wizard "previous step".
- `CloseButton`: `onClose: () => void`.

Both expose a `tone` prop so destructive-on-hover stays available where needed.

### 2. Apply the rule, surface by surface

**Route pages** — switch all to `BackButton` with explicit `to`:
- `Admin`, `AdminFeats`, `AdminScenarios`, `AdminTranslations` → `to="/"` (or parent admin route where nested)
- `PlayGame`, `HostGame` → `to="/"`
- Removes 5 hand-rolled `<Button variant="ghost" size="icon"><ArrowLeft /></Button>` blocks.

**`CharacterDetailsDialog`** — remove the `←` back button entirely; keep only the `✕` on the right (it's a fullscreen dialog, not a route). The Pencil/Trash actions stay where they are. This is the biggest UX win: one exit, not two.

**`CharacterCreationWizard`** — `←` stays as step-back only when `step > 1`; add a single `✕` top-right for "abort wizard". Today the wizard reuses the same `←` for both meanings, which is the same bug as the details dialog at a smaller scale.

**`CharacterFeatPicker`** — same treatment: `←` only when there's a previous step to go back to; `✕` to close the picker.

**Inline panels** (`AiImprovePanel`, `BackgroundInsertDialog`, `PortraitViewer`, the inline char-creation block in `PlayGame.tsx:309`) — already use `✕`. Just swap to the shared `CloseButton` so size, color and hover are uniform.

### 3. Visuals

All back/close buttons share:
- `h-8 w-8` ghost button
- `h-4 w-4` Lucide SVG (`ArrowLeft` / `X`)
- `text-muted-foreground` at rest, `hover:text-foreground`
- aria-label from `t("nav.back")` / `t("nav.close")` (new translation keys)

No glow, no gold accent, no destructive tint — back/close are quiet utility controls. Gold stays reserved for primary actions.

### 4. Memory update

Add a Core line to `mem://index.md`:
> "Back/close rule: `←` = up one level (route or wizard step). `✕` = dismiss overlay. Never both. Use `BackButton` / `CloseButton` from `src/components/nav`."

## Out of scope

- Browser back-button behavior (not touched).
- The `Dashboard` page's custom `DialogClose` at line 189 — it's already a dismissive `✕` and works correctly; it'll be swapped to `CloseButton` as a cosmetic pass.
- No route restructuring. We only standardize the controls, not the navigation graph.

## Verification

After the pass, grep should show **zero** raw `<ArrowLeft` or `<X className="h-4 w-4"` in feature code — only in `BackButton.tsx` / `CloseButton.tsx`. Smoke-test: open each route, each dialog, each wizard step; confirm one obvious exit, glyph matches the rule.
