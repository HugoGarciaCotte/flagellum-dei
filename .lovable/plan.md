

## Centralize Offline-First Mutations with a Single Helper

### Problem
Every mutation repeats the same try/catch pattern: try server, on failure queue offline + optimistic update. This is scattered across 6 files with 11+ mutations, making it hard to maintain.

### Approach: `resilientMutation` wrapper

Create a single helper function in `offlineQueue.ts` that every mutation calls instead of writing its own try/catch:

```typescript
export async function resilientMutation(
  serverFn: () => Promise<void>,
  offlineFn: () => void,
): Promise<"ok" | "queued"> {
  try {
    await serverFn();
    return "ok";
  } catch {
    offlineFn();
    return "queued";
  }
}
```

Every mutation becomes:

```typescript
const saveMutation = useMutation({
  mutationFn: async () => {
    return resilientMutation(
      async () => {
        const { error } = await supabase.from("characters").update({...}).eq("id", id);
        if (error) throw error;
      },
      () => {
        queueAction({...});
        // optimistic cache updates
      }
    );
  },
  onSuccess: (result) => {
    if (result === "queued") {
      toast({ title: "Saved locally" });
    } else {
      queryClient.invalidateQueries({...});
    }
  },
});
```

This eliminates every try/catch block from the consuming code while keeping the same behavior. The `"ok" | "queued"` return type lets `onSuccess` differentiate.

### Changes

| File | Change |
|------|--------|
| `src/lib/offlineQueue.ts` | Add `resilientMutation()` function |
| `src/components/CharacterSheet.tsx` | Replace try/catch with `resilientMutation()` |
| `src/pages/Dashboard.tsx` | Replace try/catch in `deleteCharMutation`, `handleCreateGame`, `handleJoinGame` |
| `src/pages/PlayGame.tsx` | Replace try/catch in `selectCharMutation` |
| `src/pages/HostGame.tsx` | Replace try/catch in `endGame`, `activateSection` |
| `src/components/CharacterCreationWizard.tsx` | Replace try/catch in `saveArchetype`, `saveSubfeat`, `saveFinalDetails`, `handleSkipBeforeArchetype` |
| `src/components/CharacterFeatPicker.tsx` | Replace try/catch in all 5 mutations + `validateWithAI` |

Each mutation keeps its own server logic and offline logic as separate callbacks -- the wrapper just standardizes the control flow.

