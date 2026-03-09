

## Character Portrait: Generate or Upload

Add a `portrait_url` column to the `characters` table and wire up portrait display + editing (upload or AI-generate) across the character UI.

### Database

- **Migration**: Add `portrait_url text` (nullable) to `characters` table.
- **Storage bucket**: Create a `character-portraits` public bucket with RLS allowing authenticated users to upload/delete their own portraits (path pattern: `{user_id}/{character_id}.png`).

### Edge Function: `generate-character-portrait`

A new edge function that takes `{ characterId }`, fetches the character (name, description) and its feats from the DB, then:

1. **Step 1 — Prompt generation**: Calls Lovable AI (`google/gemini-3-flash-preview`) with the character name, description, and feat list to generate an image prompt (e.g. "A dark medieval portrait of [name], a [description], who wields [feats]... fantasy RPG style, painterly, bust portrait").
2. **Step 2 — Image generation**: Calls Lovable AI (`google/gemini-2.5-flash-image`) with that prompt + `modalities: ["image", "text"]`.
3. **Step 3 — Upload**: Decodes base64 result, uploads to `character-portraits/{user_id}/{character_id}.png` (upsert), updates `characters.portrait_url` with the public URL.
4. Returns `{ portrait_url }`.

Auth: Validates the JWT to get `user_id`, confirms the character belongs to that user.

### Frontend Changes

#### `CharacterSheet.tsx`
- Display the portrait at the top (rounded, ~128px, with Avatar fallback showing initials).
- Below the portrait, two buttons: **"Upload"** (file input accepting images) and **"Generate"** (calls the edge function, shows a spinner).
- Upload handler: uploads file to `character-portraits/{user_id}/{character_id}.png`, updates `characters.portrait_url`, invalidates queries.
- Generate handler: calls `supabase.functions.invoke('generate-character-portrait', { body: { characterId } })`, on success invalidates queries.

#### `CharacterListItem.tsx`
- Add an Avatar next to the character name showing `portrait_url` if available, initials fallback.
- Update the interface to accept `portrait_url?: string | null`.

#### `CreateCharacterForm.tsx`
- No portrait at creation time (can be added after via CharacterSheet).

#### `PlayerListSheet.tsx`
- Pass `portrait_url` through to `CharacterListItem`.

#### Bottom peek bar in `PlayGame.tsx`
- Show a small avatar in the peek bar next to the character name.

### Config
- Add `[functions.generate-character-portrait]` with `verify_jwt = false` to `config.toml` (JWT validated in code).

