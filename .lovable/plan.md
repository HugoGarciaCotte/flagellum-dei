

## Simplify bottom stacking: banners push up floating buttons

### Current mess
- **OfflineBanner**: full-width bar at `bottom-0`, z-50
- **GuestBanner**: full-width bar at `bottom-0` or `bottom-12` (if offline), z-30
- **GameTimer pill**: `bottom-14 sm:bottom-6`, z-50
- **DiceRoller FAB**: `bottom-24 sm:bottom-[4.5rem]`, z-40

The banners and floating buttons each hardcode their own bottom offsets independently. On mobile, the timer/dice don't know if banners are visible, so they overlap.

### Simple approach: CSS custom property

Set a single `--bottom-bar-height` CSS variable on a wrapper, computed from which banners are visible. The floating buttons just use `calc(var(--bottom-bar-height) + their own offset)`. No complex per-component logic.

### Implementation

**1. `src/components/BottomBanners.tsx`** (new component)
Wraps both banners and sets a CSS variable on a container div. Computes height based on visibility:
- Neither visible → `0px`
- One visible → `~40px` (one banner height)
- Both visible → `~80px`

Exposes this via a React context or simpler: a shared hook.

Actually even simpler — just use a **shared hook** that returns the current bottom offset.

**`src/hooks/useBottomOffset.ts`** (new)
```ts
export function useBottomOffset() {
  const { isGuest } = useAuth();
  const online = useNetworkStatus();
  
  let offset = 0;
  if (!online) offset += 40;  // offline banner height
  if (isGuest) offset += 40;  // guest banner height
  return offset;
}
```

**2. Update `GuestBanner.tsx`**
- Always render at `bottom-0` when it's the only banner
- When offline banner is also showing, render above it: `bottom-[40px]`
- Simplify: just use `style={{ bottom: !online ? 40 : 0 }}`

**3. Update `GameTimer.tsx`**
- Import `useBottomOffset`
- On mobile: `bottom: offset + 56px` (FAB spacing above banners)
- On desktop: keep `bottom-6` as-is (banners less intrusive)

**4. Update `DiceRoller.tsx`**
- Import `useBottomOffset`
- On mobile: `bottom: offset + 96px` (above timer pill)
- On desktop: keep current value

### Files
| File | Change |
|------|--------|
| `src/hooks/useBottomOffset.ts` | New hook returning pixel offset based on visible banners |
| `src/components/GuestBanner.tsx` | Use dynamic `style.bottom` instead of hardcoded classes |
| `src/components/GameTimer.tsx` | Use `useBottomOffset()` for mobile bottom position |
| `src/components/DiceRoller.tsx` | Use `useBottomOffset()` for mobile bottom position |

