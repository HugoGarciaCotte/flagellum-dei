

## Fix: Guest character creation uses local-only path

**Problem**: The wizard checks `!online` to decide between Supabase and local paths. Guest users are online but unauthenticated, so they hit the Supabase path and get RLS errors on every save (archetype selection, subfeat saves, final details, portrait upload).

**Root cause**: Every `if (!online)` check in the wizard should be `if (!online || isGuest)`.

### Changes in `src/components/CharacterCreationWizard.tsx`

1. **Import `isGuest` from `useAuth`** (line 37):
   - Change `const { user } = useAuth()` → `const { user, isGuest } = useAuth()`

2. **`saveArchetype`** (line 173): Change `if (!online)` → `if (!online || isGuest)`

3. **`saveSubfeat`** (line 269): Change `if (!online)` → `if (!online || isGuest)`

4. **`saveFinalDetails`** (line 304): Change `if (!online)` → `if (!online || isGuest)`

5. **`handleSkipBeforeArchetype`** (line 404): Change `if (!online)` → `if (!online || isGuest)`

6. **Portrait upload `handleUpload`** (~line 461): Add guest check — for guests, convert file to a local blob URL or data URL instead of uploading to storage:
   ```ts
   if (isGuest) {
     const localUrl = URL.createObjectURL(file);
     setPortraitUrl(localUrl);
     toast({ title: "Portrait saved locally" });
     return;
   }
   ```

7. **Portrait generation `handleGeneratePortrait`**: Add guest check — for guests, the edge function call should still work (edge functions use anon key), but the storage upload won't. Save the preview URL directly instead:
   ```ts
   if (isGuest) {
     // Use preview endpoint only, save the returned URL directly
     const { data } = await supabase.functions.invoke("generate-portrait-preview", { body: { ... } });
     if (data?.url) setPortraitUrl(data.url);
     return;
   }
   ```

8. **Auto-generate description** (line 161): Change `&& online` → `&& (online && !isGuest)` since edge functions need auth — or keep it since edge functions may work with anon key. Actually, edge functions should work for guests too (they use the anon key). Keep the generation calls as-is; they don't write to DB.

This is a mechanical find-and-replace of `!online` → `!online || isGuest` across ~5 locations, plus portrait handling for guests.

