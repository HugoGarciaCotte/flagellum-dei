

## Redesign Landing Page to Sell the Game

The current landing page is generic — it describes the app's features (host, play, offline) but says nothing about what Prima TRPG actually *is*. The game deserves a page that evokes its dark medieval setting and hooks visitors emotionally.

### What Prima TRPG Is (from the data)

- A tabletop RPG set in **14th-century Europe** during the Black Death, Hundred Years' War, and the age of Inquisition
- The "Danse Macabre" campaign spans **9 scenarios** across Austria, Provins, Spain, Marseille, Avignon, the Isle of Man, and Arabia
- Players take roles as **investigators, inquisitors, mercenaries, and templars**
- Themes: ritualistic murders, pagan cults, plague, necromancy, alchemy, conspiracy
- 147 feats across categories like Prowess, Archetype, Dark Feats, and Hidden Feats
- Character-driven with feat trees and scenario-level progression

### New Landing Page Structure

**File: `src/pages/Home.tsx`** — full rewrite

#### 1. Hero Section
- Dramatic tagline: something like *"Europe, 1340. The dead do not rest."*
- Subtext establishing the tone: medieval horror investigation RPG
- CTA: "Begin Your Quest"
- Moody, dark atmosphere using the existing parchment/gold palette with darker tones

#### 2. "The World" Section
- Brief evocative paragraph about the 14th-century setting — plague, war, dark faith
- Mention the Danse Macabre campaign arc spanning 9 chapters across Europe and beyond

#### 3. "What You'll Do" Section (3 cards, but about the *game*, not the app)
- **Investigate** — Solve ritualistic murders, expose criminal syndicates, unravel conspiracies
- **Survive** — Navigate plague, civil unrest, cursed relics, and the horrors of war
- **Shape Your Fate** — Build characters with 147+ feats across combat, faith, alchemy, and dark arts

#### 4. Campaign Showcase
- A scrollable or stacked preview of the 9 Danse Macabre scenarios with their descriptions, fetched from the database
- Each card shows title, level badge, and the one-line description

#### 5. "How You Play" Section (compact, secondary)
- Brief mention of: GM hosts scenarios, players join with a code, real-time sync, works offline, install as app
- This is the old content, but demoted to a supporting role

#### 6. CTA + Footer
- Final call to action
- Install link
- Footer

### Technical Details

- Single file change: `src/pages/Home.tsx`
- Scenarios will be fetched from the database using a simple query (public read, no auth needed — already accessible)
- Uses existing UI components (Card, Button) and the existing color palette
- No new dependencies
- The page remains the unauthenticated landing; the `/auth` route stays as-is

