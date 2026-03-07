

## Standardization Opportunities

After reviewing the full codebase, here are the remaining duplications worth consolidating:

---

### 1. Page Header (4 duplicates)

Dashboard, Admin, PlayGame, and HostGame all repeat the same sticky header pattern:

```html
<header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
  <div className="container flex items-center ... h-14/h-16">
```

**Proposal**: Create `PageHeader` component.

```typescript
interface PageHeaderProps {
  title: string;
  icon?: ReactNode;
  leftAction?: ReactNode;   // e.g. back button
  rightActions?: ReactNode;  // e.g. sign out, end game, copy code
  badge?: ReactNode;         // e.g. offline indicator, level badge
}
```

Each page replaces its inline header with `<PageHeader>`, passing slots for the back button and action buttons. The styling, stickiness, and layout are defined once.

**Files**: New `src/components/PageHeader.tsx`; update `Dashboard.tsx`, `Admin.tsx`, `PlayGame.tsx`, `HostGame.tsx`.

---

### 2. Full-Page Loading Spinner (4 duplicates)

Index, Admin, PlayGame, and HostGame all have identical loading states:

```html
<div className="flex min-h-screen items-center justify-center bg-background">
  <div className="animate-pulse-glow text-primary font-display text-xl">Loading...</div>
</div>
```

**Proposal**: Create `FullPageLoader` component.

```typescript
interface FullPageLoaderProps {
  message?: string; // defaults to "Loading..."
}
```

**Files**: New `src/components/FullPageLoader.tsx`; update `Index.tsx`, `Admin.tsx`, `PlayGame.tsx`, `HostGame.tsx`.

---

### 3. Character Creation Form (2 duplicates)

Both `Dashboard.tsx` and `PlayGame.tsx` have an inline character creation form (name input + description textarea + create button + insert mutation). The only difference is that PlayGame auto-selects the character after creation.

**Proposal**: Create `CreateCharacterForm` component.

```typescript
interface CreateCharacterFormProps {
  onCreated: (characterId: string) => void;  // callback after creation
  onCancel?: () => void;                      // optional cancel button
}
```

Handles the insert mutation internally, calls `onCreated` with the new ID.

- Dashboard passes `onCreated` to switch to `CharacterSheet`
- PlayGame passes `onCreated` to call `selectCharMutation`

**Files**: New `src/components/CreateCharacterForm.tsx`; update `Dashboard.tsx`, `PlayGame.tsx`.

---

### Summary of Changes

| Component | Replaces duplicates in | Complexity |
|---|---|---|
| `PageHeader` | Dashboard, Admin, PlayGame, HostGame | Low |
| `FullPageLoader` | Index, Admin, PlayGame, HostGame | Trivial |
| `CreateCharacterForm` | Dashboard, PlayGame | Low |

Three new small components, six files updated. No logic changes, pure deduplication.

