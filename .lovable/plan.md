

## Bug: Wizard Skips to End After Archetype Pick

### Root Cause

Classic React stale-state bug. In step 1 (line 601-602):
```tsx
setArchetypeFeatId(id);
goToNextStep(1);  // runs BEFORE React re-renders
```

`goToNextStep` reads `shouldSkipFaith`, `shouldSkipSubfeat2`, `shouldSkipSubfeat3` — which are all `true` because they depend on `archetypeMeta`, which is still `null` (hasn't updated from the new `archetypeFeatId` yet). So it skips steps 2→3→4 and lands on step 5.

### Fix

**In `CharacterCreationWizard.tsx`:**

1. **Step 1 archetype selection** — only set the archetype ID, advance to step 2 unconditionally:
   ```tsx
   setArchetypeFeatId(id);
   setStep(2);  // always go to step 2 first
   ```

2. **Add a `useEffect` to handle step skipping** after the derived state has updated:
   ```tsx
   useEffect(() => {
     if (step === 2 && shouldSkipFaith) goToNextStep(2);
     if (step === 3 && shouldSkipSubfeat2) goToNextStep(3);
     if (step === 4 && shouldSkipSubfeat3) goToNextStep(4);
   }, [step, shouldSkipFaith, shouldSkipSubfeat2, shouldSkipSubfeat3]);
   ```

   This ensures skip logic only runs **after** React has re-computed the derived state from the new archetype.

3. **Remove skip logic from `goToNextStep`** — it just does `setStep(fromStep + 1)` now. The `useEffect` handles cascading skips. Same for `goToPrevStep`.

This is a minimal fix — no UI or flow changes, just fixing the timing of when skip decisions are made.

