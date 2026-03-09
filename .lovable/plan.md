

## Redesign Landing Page — AAA Cinematic Quality

Complete rewrite of `src/pages/Home.tsx` and minor additions to `src/index.css` to transform the landing page into a cinematic, prestige dark-historical RPG experience.

### What stays the same
- Theme colors (already close to the spec: deep black bg, bone white fg, antique gold primary, blood red accent)
- Fonts (Cinzel + Crimson Text already match the medieval serif direction)
- Logo component (unchanged)
- Scenarios query from database (reused in Section 5)
- Routing (`/auth`, `/install`)

### What changes

**`src/index.css`** — Add new CSS custom properties and utility classes:
- `--crimson: 0 70% 18%` for dark crimson (#5a0f0f) accent
- Parchment texture overlay utility class
- Subtle gold glow hover animation for CTAs
- Decorative divider styles (thin gold lines with ornamental center)
- Cinematic section spacing utilities

**`src/pages/Home.tsx`** — Full rewrite with 8 sections following the emotional journey:

1. **Hero** — Full-screen split layout. Left: kicker + "FLAGELLUM DEI" title + tagline ("Enter 1347. Judge the damned. Fear what answers.") + dual CTAs + reassurance text. Right: atmospheric gradient/texture treatment. Cinematic spacing, dramatic typography.

2. **Clarity Strip** — Horizontal bar with 4 gold-accented items (TTRPG, 3-9 Players, Table or Video Call, Everything Included). Removes confusion about game type.

3. **Not Fantasy** — "Not fantasy. A descent into history." Three columns: Historically Grounded Horror, Relentless Atmosphere, Everything in the Website. Parchment-textured background.

4. **How It Works** — "From First Click to First Investigation." Three numbered steps with ornamental styling: Choose a Scenario, Create Your Inquisitors, Gather the Table.

5. **Scenario Showcase** — "Open a Case. Enter a Nightmare." Three cinematic cards styled as ancient investigation files (using real scenarios from DB if available, falling back to hardcoded showcase cards). Each with evocative descriptions.

6. **Depth of Writing** — "Written like a campaign book. Delivered free in a browser." Atmospheric text block with highlighted quote. Scriptorium-inspired background treatment.

7. **FAQ** — Elegant accordion using existing Accordion component. 5 questions about the game. Minimal, dark styling.

8. **Final CTA** — Full-width cinematic close. "Bring your players to the table. The heresy is waiting." Dual CTAs + "Free forever" reassurance.

### Design approach (all CSS/Tailwind, no images)
Since we cannot generate or host illustrations, the cinematic atmosphere comes from:
- Rich CSS gradients and radial glows simulating torchlight/candlelight
- Subtle noise/texture overlays via CSS
- Dramatic typography scale (up to `text-8xl`)
- Generous whitespace (py-32, py-40 for cinematic spacing)
- Gold decorative borders and dividers
- Dark crimson accent highlights
- Atmospheric background treatments per section

### Component structure
- Keep inline sub-components: `ClarityItem`, `FeatureColumn`, `StepCard`, `ScenarioCard`
- Reuse existing `Accordion` components for FAQ
- All new content is in the prompt's copy

### Files to edit
- `src/index.css` — Add crimson variable, decorative utilities, gold glow animation
- `src/pages/Home.tsx` — Full rewrite (~450 lines)

