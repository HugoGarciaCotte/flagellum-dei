

## Improve Install Page

Expand the install instructions from 3 brief lines into detailed, per-browser/platform cards with step-by-step guidance and relevant icons.

### Changes to `src/pages/Install.tsx`

**Keep existing logic** (beforeinstallprompt capture, installed detection, "Install Now" button).

**Replace the fallback instructions** (lines 65-71) with separate styled sections for each platform:

1. **Safari (iPhone/iPad)** — icon: `Share` lucide icon
   - Step 1: Tap the Share button (square with arrow) at the bottom of Safari
   - Step 2: Scroll down and tap "Add to Home Screen"
   - Step 3: Tap "Add" in the top right
   - Note: Must use Safari — Chrome/Firefox on iOS don't support PWA install

2. **Chrome (Android)** — icon: `Chrome` or `Globe`
   - Step 1: Tap the three-dot menu (⋮) in the top right
   - Step 2: Tap "Add to Home Screen" or "Install App"
   - Step 3: Confirm by tapping "Install" or "Add"

3. **Chrome (Desktop)** — icon: `Monitor`
   - Step 1: Look for the install icon (⊕) in the address bar on the right
   - Step 2: Click "Install"
   - Alt: Use menu (⋮) → "Save and share" → "Install page as app"

4. **Firefox (Desktop)** — brief note that Firefox doesn't support PWA install natively; suggest using Chrome or Edge

5. **Edge (Desktop)** — icon: `Globe`
   - Step 1: Click the three-dot menu (⋯) → "Apps" → "Install this site as an app"

**Also add** a "Why install?" blurb above the instructions:
- Works offline — play without internet
- Launches from your home screen like a native app
- Faster load times after first visit

**Visual approach**: Use Accordion or simple collapsible sections per platform so it doesn't feel overwhelming. Reuse the existing `Accordion` component from shadcn/ui.

### Single file change
- `src/pages/Install.tsx`

