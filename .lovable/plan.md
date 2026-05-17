## Goal

Two small fixes to the in-game views:

1. **Backgrounds should display raw** — no dim/tint overlay on top of scenario background images shown to players (and to the GM).
2. **"Install as app" link shouldn't appear in the middle of game screens** over the background — it currently renders inside the scrollable game area on both `PlayGame` and `HostGame`.

## Changes

### `src/pages/PlayGame.tsx`
- Remove the `linear-gradient(... hsl(var(--background)/0.3) ... 0.5)` overlay from the background style (line 142). Keep only `url(${activeBg})` with `cover` / `center` so the scenario image renders as-is.
- Remove the `{!window.matchMedia('(display-mode: standalone)').matches && (...install link...)}` block (lines 175–181). The install option remains available from the home/dashboard; it does not belong over a scenario backdrop.

### `src/pages/HostGame.tsx`
- Remove the same install-link block (lines 270–276) for consistency, so it doesn't float in the middle of the GM's scenario view either.
- (No background overlay change needed here — the GM view uses `WikiSectionTree` which renders its own card backgrounds; user only complained about the player-facing image and the install link placement.)

## Out of scope

- `WikiSectionTree` inner section backgrounds keep their card-tinted gradient — they're inside readable cards, not the full-screen scenario image.
- The Install page itself and the install entry point on Home/Dashboard are unchanged.
