## Goal

Reuse `PageHeader` as-is (container, responsive geometry, `sm:h-14`, flex-wrap) for all screen/dialog bars. Add the **minimum** props needed and migrate the 3 inline bars to it. No `fullBleed`, no `min-h-12` compact mode.

## Why only minimal new props

`PageHeader`'s existing layout (`container`, `sm:h-14`, `flex-wrap`, `gap-x-3 gap-y-1`) already handles title + slots cleanly. The three target sites just need to:
- hide the logo (dialog title shouldn't have it),
- optionally switch to a "solid" tone (fullscreen dialog needs `bg-card` not `bg-card/50 backdrop-blur`),
- optionally drop `safe-top` (for `PlayGame.tsx:307` which is mid-screen, not at the top of the viewport).

That's it. Everything else stays.

## Changes

### 1. `src/components/PageHeader.tsx` — add 3 optional props

```ts
interface PageHeaderProps {
  title: string | ReactNode;     // widen to ReactNode (some call sites pass styled nodes)
  icon?: ReactNode;
  leftAction?: ReactNode;
  rightActions?: ReactNode;
  badge?: ReactNode;
  // NEW (all optional, defaults preserve current behavior)
  showLogo?: boolean;            // default true
  tone?: "translucent" | "solid"; // default "translucent" = current bg-card/50 backdrop-blur + border-primary/10
                                  //          "solid"      = bg-card + border-border (for fullscreen dialogs)
  safeTop?: boolean;             // default true
}
```

Render adjustments inside the existing `<header>`:
- `tone="solid"` → swap `bg-card/50 backdrop-blur border-primary/10` for `bg-card border-border`
- `showLogo === false` → omit `<Logo />`
- `safeTop === false` → omit `pt-[env(safe-area-inset-top)]`

All other classes (`container`, `flex-wrap`, `sm:h-14`, etc.) stay exactly as they are. The 6 existing call sites are unaffected.

### 2. Migrate `Dashboard.tsx:188`

The current secondary bar becomes a second `PageHeader`:

```tsx
<PageHeader
  showLogo={false}
  title={/* existing title node */}
  rightActions={/* existing right cluster */}
/>
```

### 3. Migrate `PlayGame.tsx:307`

```tsx
<PageHeader
  showLogo={false}
  safeTop={false}
  title={/* existing title */}
  leftAction={/* existing left */}
  rightActions={/* existing right */}
/>
```

### 4. Migrate `CharacterDetailsDialog.tsx:98`

```tsx
<PageHeader
  showLogo={false}
  tone="solid"
  title={title}
  leftAction={editing && <BackButton onClick={() => setEditing(false)} />}
  rightActions={<>
    {!editing && canEdit && <HeaderIconButton onClick={() => setEditing(true)}><Pencil className="h-4 w-4"/></HeaderIconButton>}
    {!editing && canDelete && <HeaderIconButton tone="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4"/></HeaderIconButton>}
    <DialogClose asChild><CloseButton onClose={() => {}}/></DialogClose>
  </>}
/>
```

The local `HeaderIconButton` definition stays inside this file (no scope creep).

### 5. Leave alone

- `GameTimer` popover header — different geometry (floating card)
- `Home` marketing nav — fixed, full-width, marketing styling
- `PlayGame.tsx:243` in-card sub-panel header — rounded-t-xl, inside a card

## Verification

Screenshot at current viewport (970×693):
- Dashboard (both header rows)
- PlayGame top bar
- CharacterDetailsDialog details + edit mode
- One Admin page (`AdminFeats`) to confirm existing call sites unchanged

Compare against current preview to catch regressions.

## Memory update

Add `mem://ui/components/page-header` describing the 3 new props and the rule: *"All screen/dialog top bars go through `PageHeader`. Only floating popovers and the marketing nav are exempt."*