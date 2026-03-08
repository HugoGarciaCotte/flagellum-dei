

## Fix iPhone Safe Area (Dynamic Island / Notch)

The issue is that the PWA runs in `standalone` mode where there's no browser chrome, so the app content renders behind the Dynamic Island / notch. The fix requires two things:

### Changes

#### 1. `index.html` — Already has `viewport-fit=cover`, which is correct. No change needed.

#### 2. `src/index.css` — Add safe area padding to the body/root
Add to the `@layer base` body rule:
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

This pushes all content below the Dynamic Island and above the home indicator on iPhones. The `env(safe-area-inset-*)` values are zero on devices without notches, so no side effects.

#### 3. `src/components/PageHeader.tsx` — Adjust sticky header
Since the body now has the top padding, the sticky header at `top-0` will naturally sit below the safe area. No change needed — it inherits the body padding context.

One file, four lines of CSS.

