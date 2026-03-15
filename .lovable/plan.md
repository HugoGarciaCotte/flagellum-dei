

## Mobile improvements for HostGame page

Two fixes: responsive header layout and bottom bar stacking.

---

### 1. Responsive header (`PageHeader.tsx` + `HostGame.tsx`)

**Problem:** Title, badges, join code, and action buttons all crammed in one `h-14` row — wraps badly on mobile.

**Fix — PageHeader.tsx:**
- Split into two rows on mobile: Row 1 = left action + logo + title (truncated `line-clamp-1 min-w-0`), Row 2 = badges + right actions
- Use `flex-wrap` on the container, let it grow beyond `h-14` on mobile
- Title gets `truncate` to prevent multi-line wrapping

**Fix — HostGame.tsx:**
- Join code button: hide the label text on mobile (`hidden sm:inline`), keep just the code + copy icon
- End game button: hide text on mobile, show icon only (`hidden sm:inline` on the label)
- PlayerListSheet trigger already has an icon, just ensure it's `size="icon"` on mobile

### 2. Bottom bar stacking (`GuestBanner.tsx`, `OfflineBanner.tsx`)

**Problem:** Guest banner, offline banner, timer pill, and dice roller all use `fixed bottom-0` or `fixed bottom-6` — they overlap on mobile.

**Fix:**
- `OfflineBanner.tsx`: stays at `bottom-0` (lowest layer, `z-50`)
- `GuestBanner.tsx`: currently uses conditional `bottom-0`/`bottom-10`. Keep this pattern but use a taller offset when offline (`bottom-12` instead of `bottom-10`)
- `GameTimer.tsx` and `DiceRoller.tsx` already use `bottom-6` with `z-50`. Bump them to `bottom-16` on mobile when guest+offline banners are visible — but since these components don't know about banner state, the simpler approach: increase their base `bottom` to `bottom-14 sm:bottom-6` so they always clear the banners on mobile
- Similarly for `DiceRoller.tsx`, adjust the `bottom` position

### Files to edit

| File | Change |
|------|--------|
| `src/components/PageHeader.tsx` | Wrap layout: two rows on mobile, truncate title |
| `src/pages/HostGame.tsx` | Icon-only buttons on mobile for join code, end game |
| `src/components/GuestBanner.tsx` | Adjust bottom offset for offline stacking |
| `src/components/GameTimer.tsx` | Use `bottom-14 sm:bottom-6` to clear banners on mobile |
| `src/components/DiceRoller.tsx` | Same bottom offset adjustment |

