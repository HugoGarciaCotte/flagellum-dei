

## Update Chapter 1 Showcase Card

Two changes:

### 1. Rewrite Chapter 1 text
Update `showcaseScenarios[0]` in `src/pages/Home.tsx`:
- **Title**: "The Societas Templois"
- **Description**: Reworded version of: *"A curse shadows the Habsburg family, leading to an Austrian abbey — seat of a long-dead secret society. They tried to lock their damnation away. But how long can you run from the Devil?"*

### 2. Swap image for Chapter 1
The `scenarioImages` array maps `[scenario1Img, scenario2Img, scenario3Img]` to chapters 1, 2, 3. To use the Chapter 2 image for Chapter 1:
- Change the array to `[scenario2Img, scenario1Img, scenario3Img]` — swapping images 1 and 2 so Chapter 1 gets the old Chapter 2 image and vice versa.

Both changes are in `src/pages/Home.tsx` only (the `showcaseScenarios` array and `scenarioImages` array). No translation key changes needed since these scenarios are hardcoded, not in `en.ts`.

