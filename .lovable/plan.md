

## Clarify "Tabletop RPG" on Home Page

### Changes in `src/pages/Home.tsx`

1. **Hero subtitle** (line 56): Change from `"A Tabletop RPG of Medieval Horror"` to something like `"A Tabletop RPG for 3–9 Players · Best Played In Person"`

2. **Add a short clarification line** below the hero description (after line 67): A small muted line like: *"Flagellum Dei is a pen-and-paper tabletop RPG — gather around the table with 3 to 9 players, or connect via video call. This app is your digital companion for managing characters, scenarios, and game sessions."*

3. **"How You Play" section** (lines ~175-200): Update the first `MiniFeature` label to clarify the in-person nature, e.g. *"Gather 3–9 players around a table — or via video call"* as the first item, shifting the GM/scenario one to second position.

These are copy-only changes — no structural or component modifications needed.

