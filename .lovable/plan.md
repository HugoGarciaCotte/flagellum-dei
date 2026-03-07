

## Plan: Public Homepage with Play Button

### What to build
A public landing page at `/` that explains Quest Scroll — the RPG scenario app. The current `/` route redirects to `/auth` if not logged in; instead, show a marketing homepage.

### Changes

**1. Create `src/pages/Home.tsx`** — Public landing page:
- Hero section with Quest Scroll branding (Crown icon, tagline)
- 2-3 feature sections explaining the concept (host scenarios, real-time sync, offline play, PWA)
- Dark RPG aesthetic using existing Cinzel/Crimson Text fonts and gold/parchment palette
- Top-right "Play" button in a sticky header that navigates to `/auth`

**2. Update `src/pages/Index.tsx`**:
- If user is logged in → show Dashboard (as now)
- If not logged in → show Home (instead of redirecting to `/auth`)

**3. No new routes needed** — `/` already exists, just change the unauthenticated behavior.

### Home page structure
- **Header**: "Quest Scroll" logo left, "Play" button right (links to `/auth`)
- **Hero**: Large heading + subtitle + CTA button
- **Features**: 3 cards — "Host Scenarios", "Real-time Play", "Works Offline"
- **Footer**: Simple branding

