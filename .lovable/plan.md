

## Bug: Third Choice Missing in Wizard

### Root Cause

The faith detection in `faithInfo` (line 107-129) checks whether a subfeat list option has category `"Faith"` or `"Faith Feat"`. But the feat `⭐ Faith` actually has category `"General Feat"` — not `"Faith"`. So `faithInfo` returns `null`.

When `faithInfo` is null:
- Step 2 (faith) is **skipped**
- `subfeat2Info` picks slot 1 (the `⭐ Faith` list — the user sees this as "Choose Your Specialty" and picks the faith feat, thinking it was the faith step)
- `subfeat3Info` picks slot 2 (the fixed granted feat)
- **Slot 3 (the actual choice list) is never assigned** — the wizard only has room for faith + 2 slots

### Fix in `CharacterCreationWizard.tsx`

**Update `faithInfo` detection** (lines 107-129) to also match by option **title** containing "Faith", not just by category:

```ts
if (slot.kind === "list" && slot.options) {
  const hasFaith = slot.options.some(o => {
    const f = featByTitle.get(o);
    const catMatch = f?.categories?.includes("Faith") || f?.categories?.includes("Faith Feat");
    const titleMatch = o.toLowerCase().includes("faith");
    return catMatch || titleMatch;
  });
  if (hasFaith) {
    return { slot: slot.slot, allowsFaith: true, allowsDarkFaith: false };
  }
}
```

This ensures archetypes with `feat_subfeat:1: list, optional, ⭐ Faith` correctly detect the faith slot, so all 3 remaining slots are properly assigned to steps 3 and 4.

