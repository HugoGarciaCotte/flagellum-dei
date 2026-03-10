

## Add Offline FAQ Entry

Add a new FAQ item after the "Can I install this as an app?" entry (line 176) that addresses offline functionality.

**New FAQ entry:**
```typescript
{
  q: "Does it work offline?",
  a: "Yes! Once installed as a PWA, the game works fully offline — character creation, feat browsing, dice rolling, and scenario reading all function without an internet connection. The only features that require connectivity are online multiplayer gaming and background music.",
}
```

Single edit to `src/pages/Home.tsx`, inserting after line 176.

