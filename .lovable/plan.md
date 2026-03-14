

## Plan: Reorder FAQ logically

Current order and proposed regrouping into a natural flow — **"What is it → How to play → Technical / Meta"**:

### New order (old index → new index):

| New # | Question | Old # | Group |
|-------|----------|-------|-------|
| q0 | What is Flagellum Dei? | q1 | What is it |
| q1 | Is this a video game? | q3 | What is it |
| q2 | Is it really free? What's the catch? | q0 | What is it |
| q3 | Do I need a rulebook? | q5 | How to play |
| q4 | How many players can play? | q4 | How to play |
| q5 | Can we play online? | q6 | How to play |
| q6 | Does the game promote a particular faith? | q7 | Content |
| q7 | How much of this was made with AI? | q11 | Content |
| q8 | Is Flagellum Dei related to Prima RPG? | q2 | Meta |
| q9 | Is this project open source? | q8 | Meta |
| q10 | Can I install this as an app? | q9 | Technical |
| q11 | Does it work offline? | q10 | Technical |

### Changes

1. **`src/i18n/en.ts`** — Rewrite q0–q11 keys with the reordered content (same text, new numbering).
2. **`src/i18n/fr.ts`** — Same reordering for French translations (if the keys exist there).

No changes needed to `Home.tsx` since `faqCount` stays at 12.

