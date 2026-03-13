

## Full Multilingual System — English + French

### Architecture Overview

```text
┌──────────────────────────────────────────┐
│ Browser detects navigator.language       │
│ → localStorage override if user chose    │
│                                          │
│ I18nProvider (React Context)             │
│  ├─ locale: "en" | "fr"                 │
│  ├─ t(key) → DB override > static JSON  │
│  └─ setLocale(l) → persist + reload DB  │
│                                          │
│ Every component: t("home.hero.tagline")  │
│                                          │
│ LanguagePicker (bottom-right, fixed)     │
│  Small globe icon, popover with flags    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Admin → /admin/translations              │
│  Accordion grouped by screen             │
│  Each row: key | en text | fr input      │
│  Red badge if fr is missing/same as en   │
│  "Generate with AI" per row + bulk       │
│  "Download JSON" → export + clear DB     │
│  Top banner: "X missing translations"    │
└──────────────────────────────────────────┘
```

### Step 1 — Database: `translations` table

```sql
CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL DEFAULT 'fr',
  value text NOT NULL,
  screen text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(key, locale)
);
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Public read (translations are public content)
CREATE POLICY "Anyone can read translations" ON public.translations
  FOR SELECT TO public USING (true);

-- Owner-only write
CREATE POLICY "Owner can manage translations" ON public.translations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
```

### Step 2 — Static translation dictionaries

Create `src/i18n/en.ts` and `src/i18n/fr.ts` with all hardcoded strings organized by screen. Keys follow the pattern `screen.section.identifier`. French starts as a copy of English.

Approximate key count by screen:
- `home.*` — ~50 keys (hero, clarity strip, features, how-it-works, scenarios, FAQ, CTA, footer)
- `auth.*` — ~20 keys (login, signup, guest, forgot password)
- `dashboard.*` — ~25 keys (join game, characters, hosting)
- `game.*` — ~20 keys (play/host screens, timers, banners)
- `install.*` — ~15 keys (instructions per browser)
- `admin.*` — ~10 keys (panel, navigation)
- `common.*` — ~15 keys (offline banner, guest banner, toasts)

### Step 3 — I18n context and hook

Create `src/i18n/I18nContext.tsx`:
- Detects `navigator.language` → `"fr"` if starts with `fr`, else `"en"`
- Checks `localStorage("locale")` for user override
- On mount, fetches all DB translations for the active locale
- `t(key)` returns: DB override → static locale dict → English fallback
- `setLocale(l)` updates state + localStorage + re-fetches DB

Create `src/i18n/useTranslation.ts` — thin hook: `const { t, locale, setLocale } = useTranslation()`

Wrap `<App>` in `<I18nProvider>`.

### Step 4 — Language picker component

Create `src/components/LanguagePicker.tsx`:
- Fixed position bottom-right corner (above offline banner if present)
- Small globe icon button, opens a popover with "English" and "Français"
- Discreet, semi-transparent, does not disrupt layout
- Rendered globally inside `App.tsx`, outside of routes

### Step 5 — Replace all hardcoded strings

Modify every page and component to use `t()` calls instead of string literals:
- `Home.tsx` — all section headings, descriptions, FAQ questions/answers, button labels
- `Auth.tsx` — form labels, buttons, toasts
- `Dashboard.tsx` — section titles, buttons, dialogs
- `PlayGame.tsx` / `HostGame.tsx` — game UI text
- `Install.tsx` — instructions
- `Admin.tsx` — panel titles
- `GuestBanner.tsx`, `OfflineBanner.tsx` — banner messages
- `PageHeader.tsx` — no changes needed (title comes from pages)

### Step 6 — Admin translations page

Create `src/pages/AdminTranslations.tsx` (`/admin/translations`):

**Layout:**
- Top: big red banner showing count of missing translations (where `fr` value is null/empty)
- Grouped by screen in accordion sections
- Each row: translation key, English text (read-only), French text (editable input), "Generate" button
- Bulk "Generate All Missing" button at the top
- "Download JSON & Clear DB" button

**AI generation per row:**
- Calls edge function `generate-translation`
- Sends: English text + screen name + surrounding HTML context from the static dictionary
- Saves result to `translations` table

**Download JSON:**
- Exports all DB translations as `{ "fr": { "key": "value", ... } }`
- After download, deletes all rows from the `translations` table
- The downloaded JSON is meant to replace `src/i18n/fr.ts`

Add a navigation card on `/admin` linking to this page.

### Step 7 — Edge function: `generate-translation`

Create `supabase/functions/generate-translation/index.ts`:
- Receives: `{ key, english_text, target_locale, screen, html_context }`
- Uses Lovable AI gateway with `google/gemini-2.5-pro` (strong model for translation quality)
- System prompt instructs the model to:
  - Translate naturally for the target locale
  - Preserve any HTML tags, links, and formatting
  - Use the HTML context to understand where the text appears on screen
- Returns `{ translated_text: string }`
- Handles 429/402 rate limit errors

Config addition:
```toml
[functions.generate-translation]
verify_jwt = false
```

### Files Summary

| Action | File |
|--------|------|
| Migration | `translations` table |
| Create | `src/i18n/en.ts` |
| Create | `src/i18n/fr.ts` |
| Create | `src/i18n/I18nContext.tsx` |
| Create | `src/i18n/useTranslation.ts` |
| Create | `src/components/LanguagePicker.tsx` |
| Create | `src/pages/AdminTranslations.tsx` |
| Create | `supabase/functions/generate-translation/index.ts` |
| Modify | `src/App.tsx` — wrap in I18nProvider, add route, add LanguagePicker |
| Modify | `src/pages/Home.tsx` — replace ~50 strings with t() |
| Modify | `src/pages/Auth.tsx` — replace ~20 strings |
| Modify | `src/pages/Dashboard.tsx` — replace ~25 strings |
| Modify | `src/pages/PlayGame.tsx` — replace ~20 strings |
| Modify | `src/pages/HostGame.tsx` — replace ~20 strings |
| Modify | `src/pages/Install.tsx` — replace ~15 strings |
| Modify | `src/pages/Admin.tsx` — add translations nav card |
| Modify | `src/components/GuestBanner.tsx` — replace strings |
| Modify | `src/components/OfflineBanner.tsx` — replace strings |

