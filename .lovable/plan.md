

## Update Scenario 2 → Chapter 7: The Hundred Years' War

### Changes

**1. Generate an AI image** for the scenario card using the edge function or AI image generation:
- A dark, menacing red knight on a vast medieval battlefield, carrying a banner bearing the coat of arms shown in the uploaded image (Gules, a fess Or, with green frogs). Evil, apocalyptic tone matching the game's dark medieval horror aesthetic.
- Save to `src/assets/landing-scenario-2.jpg` (replacing the current one used for this card slot — note the image array is `[scenario2Img, scenario1Img, scenario3Img]` so index 1 maps to `scenario1Img` which is the file `landing-scenario-1.jpg`... actually the swap means scenario card 2 uses `scenario1Img`).

Wait — let me re-check the image mapping. The array is `[scenario2Img, scenario1Img, scenario3Img]`, so:
- Card 0 (Chapter 1) → `scenario2Img` (landing-scenario-2.jpg)
- Card 1 (Chapter 7) → `scenario1Img` (landing-scenario-1.jpg)  
- Card 2 (Chapter 3) → `scenario3Img` (landing-scenario-3.jpg)

So the new generated image should replace `landing-scenario-1.jpg` or we add a new image and update the array.

**2. Update `showcaseScenarios[1]`** in `src/pages/Home.tsx`:
- **Title**: "The Hundred Years' War"
- **Level**: 7
- **Description** (reworded from user's input): *"For three days the city has burned and bled — every rule of chivalry ground to dust. In savagery, men forget their nations and follow blindly the banner Gules, a fess Or. The banner of the Devil."*

**3. Generate the image** using the Lovable AI image generation endpoint (`google/gemini-3-pro-image-preview`) via a one-time edge function call or inline generation. The prompt:
> "A terrifying red-armoured knight standing on a vast medieval battlefield strewn with bodies, dark stormy sky, holding a large war banner depicting a red shield with a yellow horizontal band and green frogs (heraldic coat of arms). Dark medieval horror style, oil painting aesthetic, dramatic lighting."

Save the resulting image as `src/assets/landing-scenario-war.jpg` and update the `scenarioImages` array.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Update scenario 2 text (title, description, level), update `scenarioImages` array |
| `src/assets/landing-scenario-war.jpg` | New AI-generated image |

