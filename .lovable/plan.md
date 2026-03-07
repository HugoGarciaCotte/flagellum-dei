

## Prima Danse Macabre RPG — Implementation Plan

### 1. Backend Setup (Lovable Cloud / Supabase)
- **Auth**: Email/password signup & login
- **Database tables**:
  - `profiles` — user info (linked to auth)
  - `scenarios` — pre-made scenarios with metadata
  - `scenario_sections` — sections per scenario (title, rich text content, background color/image)
  - `games` — created games (host user, selected scenario, current section, short join code)
  - `game_players` — players who joined a game (user, optional character)
  - `characters` — user-created characters (name, description)
- **Real-time**: Enable Supabase Realtime on `games` table so players instantly see section changes
- **RLS**: Users can read/write their own characters, read scenarios, hosts can update their games

### 2. Auth Pages
- Simple login/signup page with email & password
- Redirect to home after login

### 3. Home Page
- Two large buttons: **Create a Game** and **Join a Game**
- Clean, centered layout

### 4. Create a Game Flow
- Pick a scenario from a list of pre-made scenarios
- Game is created with a short 6-character join code
- Redirects to Game Master view

### 5. Join a Game Flow
- Enter the short join code
- Choose: **Select existing character**, **Create new character** (name + description), or **Join without character**
- Redirects to Player view

### 6. Game Master View (Desktop/Tablet-first, responsive)
Three tabs:
- **Scenario Tab**: Shows all sections of the scenario as a scrollable rich text view. Clicking a section sets it as the "current section" (updates the game record in real-time for players)
- **Players Tab**: Lists all players who joined with their character names
- **Player View Tab**: Preview of what players see — the background color of the current section

Floating dice button in the corner on all tabs — click to roll a random d6 (or configurable) and show the result in a toast/modal.

### 7. Player View (Mobile-first, responsive)
Two tabs:
- **Scene Tab**: Full-screen background color matching the GM's current scenario section (updates in real-time)
- **Character Sheet Tab**: Shows the player's character name and description (placeholder for future complexity)

Floating dice button in bottom-right corner.

### 8. Seed Data
- One pre-made scenario: "Prima Danse Macabre — Intro"
  - Section 1: "Part One" — Lorem ipsum text, solid blue background
  - Section 2: "Part Two" — Lorem ipsum text, solid red background

### 9. Dice Roller
- Floating action button (dice icon) visible on all game screens
- Click → rolls a d20 (or d6) → shows animated result in a popup/toast

