## Goal
Episode 4 (Chapter 4 - Danse Macabre) has 16 `background_image` references pointing to `/scenario-backgrounds/a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78/<id>.png` — a path that doesn't exist. The actual files were uploaded to `public/backgrounds/bg-<id>.png`.

All 16 timestamp IDs referenced in the wikitext match files present on disk, so this is a pure path rewrite.

## Change
In `src/data/scenarios.ts`, scoped to the Chapter 4 entry only, rewrite every:
```
/scenario-backgrounds/a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78/<ID>.png
```
to:
```
/backgrounds/bg-<ID>.png
```

Done via a targeted `sed` on that single id pattern (safe — the path is unique to episode 4).

## Verification
- Grep after edit to confirm 0 remaining `/scenario-backgrounds/a2b3c4d5...` references.
- Confirm 16 new `/backgrounds/bg-*.png` references in episode 4.
