

## Show AI Validation Reason When Feat Is Rejected

### Problem

When the `validate-feat` edge function rejects a feat, the mutation throws `new Error(data.reason)` but the `upsertMutation` has no `onError` handler. The error is silently swallowed — the user never sees why the feat was blocked.

### Fix

Add an `onError` callback to `upsertMutation` in `src/components/CharacterFeatPicker.tsx` (after the `onSuccess` block around line 228) that shows a toast with the AI's reason:

```typescript
onError: (error: any) => {
  toast({
    title: "Cannot pick this feat",
    description: error.message || "Prerequisites not met",
    variant: "destructive",
  });
},
```

### Files Changed

1. **`src/components/CharacterFeatPicker.tsx`** — Add `onError` handler to `upsertMutation` showing a destructive toast with the validation reason.

