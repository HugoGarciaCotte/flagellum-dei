

## Remove Scenario-Level Playlist Fallback

### Context
The `resolvedPlaylist` memo in `HostGame.tsx` (lines 90-108) has a special case: when no section is active (`!activeSection`), it reads `parsed.metadata.playlist` as a scenario-level fallback. This shouldn't exist — playlists are defined per-section via `<!--@playlist:...@-->` tags, and the Intro section already has one.

### Problem
Lines 91-93 reference a "scenario-level playlist" concept that shouldn't exist. The previous plan also proposed seeding `walkPlaylist` with this value, which is wrong.

### Fix

**`src/pages/HostGame.tsx`** — Simplify `resolvedPlaylist` to always walk the section tree, returning `null` when no section is active:

```typescript
const resolvedPlaylist = useMemo((): PlaylistInfo | null => {
  if (!activeSection) return null;
  function walkPlaylist(
    secs: typeof sections,
    parentPlaylist: PlaylistInfo | null
  ): PlaylistInfo | null {
    for (const s of secs) {
      const effective = resolvePlaylist(s, parentPlaylist);
      if (s.id === activeSection) return effective;
      const found = walkPlaylist(s.children, effective);
      if (found) return found;
    }
    return null;
  }
  return walkPlaylist(sections, null);
}, [activeSection, sections]);
```

Changes: Remove lines 91-93 (scenario-level fallback) and remove `parsed.metadata.playlist` from the dependency array. One file, ~3 lines removed.

