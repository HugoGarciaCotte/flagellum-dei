

## Plan: Fix Chapter 9 image

The third scenario card (Chapter 9 — The Mad King) currently uses `landing-scenario-war.jpg`, which shows a castle/fortress. The correct desert sandstorm image appears to be `landing-scenario-3.jpg`, which is imported but unused.

### Change

**`src/pages/Home.tsx`** line 34 — swap `scenarioWarImg` for `scenario3Img`:

```tsx
const scenarioImages = [scenario1Img, scenarioMarseilleImg, scenario3Img];
```

One line change. The `scenarioWarImg` import can also be removed as cleanup.

