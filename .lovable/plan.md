## Root cause

The header in `src/components/CharacterDetailsDialog.tsx` mixes **three different icon systems** inside a single `items-center` row, each with its own vertical-centering behavior:

| Slot | What it is | How it sits in the bar |
|---|---|---|
| `←` back | Unicode glyph in `<span class="text-base leading-none">` inside `Button h-8 w-8` | Glyph mass rides high; `leading-none` collapses the line box so flex centers the glyph's top edge |
| Title | `font-display` serif span with hack `relative top-[6px]` | Optically centered (after the hack) |
| `✎` edit | Unicode glyph in `<span class="text-base">` (no `leading-none`) inside `Button h-8 w-8` | Different metrics from `←`, sits even higher |
| `Trash2` | Lucide SVG `h-4 w-4` inside `Button h-8 w-8` with `text-destructive` | Perfectly centered (SVG fills its own box), but bright red |
| `X` close | Lucide SVG `h-5 w-5` inside a `DialogClose` with only `p-1` (not a `Button`, different size, no `h-8 w-8`) | Different hit target and bigger glyph than the others |

So we have: two Unicode glyphs with different line-box behavior, two Lucide SVGs at two different sizes, one wrapper that isn't a Button, one color outlier, and a `top-[6px]` band-aid on the title. Of course nothing lines up.

Project memory says "No Lucide — use Alchemical/Unicode glyphs sized with `text-*`". The Lucide `Trash2` and `X` here are pre-existing violations. So the cleanest fix is also the one that conforms to the rule: **make every icon in this header a Unicode glyph rendered through one shared wrapper.**

## Plan

### 1. Introduce a tiny `HeaderIconButton` (local to the file, no new component file)

A single inline component used for all four icons. It owns the centering once and for all:

```tsx
const HeaderIconButton = ({ glyph, label, onClick, tone = "default" }) => (
  <Button
    variant="ghost"
    size="icon"
    className={`h-8 w-8 shrink-0 flex items-center justify-center ${
      tone === "destructive" ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"
    }`}
    aria-label={label}
    onClick={onClick}
  >
    <span className="text-lg leading-none translate-y-[1px]" aria-hidden="true">{glyph}</span>
  </Button>
);
```

Key decisions:
- `text-lg` so all four glyphs render at the same visual weight (current `text-base` for the back arrow is too thin next to the SVGs).
- `leading-none` collapses the line box, then a single `translate-y-[1px]` nudge optically centers Unicode glyphs that ride high. One nudge, in one place, applied to every icon — so they all share a baseline.
- `tone="destructive"` only changes the **hover** color. At rest the trash matches the others (muted). This removes the "red sticks out" problem and matches the convention that destructive intent is signalled on hover + confirmation dialog (which already exists).

### 2. Replace all four header icons with `HeaderIconButton`

| Slot | Glyph | Tone | Notes |
|---|---|---|---|
| Back | `←` (U+2190) | default | Same as today, just routed through the wrapper |
| Edit | `✎` (U+270E) | default | Replaces the standalone Unicode `<span>` |
| Delete | `🗑` (U+1F5D1) | destructive | Replaces Lucide `Trash2`. Removes the persistent red. |
| Close | `✕` (U+2715) | default | Replaces Lucide `X`. Wrap a `DialogClose asChild` around the button so the close behavior is preserved without altering the existing dialog API. |

Drop the `import { X, Trash2 } from "lucide-react"` line.

### 3. Title alignment without the `top-[6px]` hack

The title hack was needed because the bar had `items-center` but the serif font's glyph mass biases up. Once every icon is centered through the shared wrapper (which already applies the same `translate-y-[1px]` nudge), the cleanest fix is to apply the **same** `translate-y-[1px]` to the title so it shares the icons' optical baseline:

```tsx
<span className="font-display text-base font-medium text-foreground truncate leading-none translate-y-[1px]">{title}</span>
```

Replace the existing `relative top-[6px]` with `translate-y-[1px]`. With every element nudged by the same amount through the same mechanism, the row is mechanically aligned, not eyeballed.

### 4. Verify on a desktop screenshot

Reopen the details dialog at 1440 wide, screenshot the header, zoom in on the top 60px, measure the vertical center of each glyph against the bar center. Target: every glyph's optical center within 1px of the bar center, no element more than 1px off any other. Repeat in the edit state (where only `←` and `✕` are visible) to confirm consistency.

## What this does NOT change

- The Edit Character dialog body, the read-only details body, no other component — purely the dialog header bar.
- Behavior: same click targets, same destructive confirmation flow, same dialog open/close API.
- No new dependency, no new file.

## What this fixes

- Back arrow, edit, delete, close all share one optical center line — no per-icon eyeballing.
- One color for the resting state of all four icons; destructive intent appears on hover only, not as a constant red beacon.
- All four icons render at the same size (`text-lg`).
- Title's `top-[6px]` hack is replaced with the same `translate-y-[1px]` rule used by the icons, so the whole row is governed by one alignment principle instead of three.
- Removes the two Lucide violations from this file.
