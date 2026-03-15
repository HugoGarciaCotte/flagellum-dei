

## Add title to timer popup

**File: `src/components/GameTimer.tsx`** (line ~150)

Add a title label inside the expanded timer card, above the `TimerControls`:

```tsx
<div className="bg-card border border-border rounded-2xl shadow-xl p-4 flex flex-col items-center gap-3 min-w-[180px] relative">
  <button ...>✕</button>
  <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("timer.title")}</span>
  <TimerControls ... />
</div>
```

**Files: `src/i18n/en.ts` + `fr.ts`**
- `timer.title`: "Ambiance Timer" / "Minuteur d'ambiance"

