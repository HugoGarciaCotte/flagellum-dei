

## Plan: Add AI usage FAQ entry

### Changes

1. **`src/i18n/en.ts`** — Add `home.faq.q11` and `home.faq.a11`:
   - **Q:** "How much of this was made with AI?"
   - **A:** "The heart of the game — every scenario, feat, and piece of lore — is 100% handwritten. AI was only used for minor spelling corrections and light rephrasing. The content is the result of a full decade of work by history and tabletop enthusiasts. The website interface and illustrations, however, were generated with AI."

2. **`src/pages/Home.tsx`** — Change `faqCount` from `11` to `12` (line 176).

That's it — the FAQ rendering loop already handles any count automatically.

