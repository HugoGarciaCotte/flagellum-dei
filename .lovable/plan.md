

## Update Scenario 3 → "The Mad King"

### Changes in `src/pages/Home.tsx`

**1. Update `showcaseScenarios[2]`** (lines 144-149):
- **Title**: "The Mad King"
- **Level**: 3 (keeping same)
- **Description** (reworded from user input): *"A host of Knights Templar, lost in the Arabian desert, uncover an ancient evil — biblical in nature — that threatens to drown the world in endless madness."*

**2. Generate AI image** → `src/assets/landing-scenario-3.jpg` (replacing existing):
- Prompt: "A group of Knights Templar on horseback lost in a vast Arabian desert sandstorm, silhouetted figures struggling against the wind, and within the swirling sand a colossal shadowy king figure barely visible looming over them. Dark medieval horror style, muted earth tones, oil painting aesthetic, ominous and foreboding atmosphere."
- Using `google/gemini-3-pro-image-preview` via the generate-portrait-preview edge function pattern for high quality.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Update scenario 3 title, description |
| `src/assets/landing-scenario-3.jpg` | New AI-generated image (replace existing) |

