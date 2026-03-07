

## Parse and Use `<!--@ key: value @-->` Metadata Tags

### Overview

Extract metadata tags from wikitext comments. `scenario_level` is scenario-scoped (top of page, before any heading). `background_image` is section-scoped and inherits down the tree (child sections fall back to parent's background).

### 1. Update `WikiSection` interface and parser (`src/lib/parseWikitext.ts`)

- Add `metadata: Record<string, string>` to `WikiSection`
- Add a new top-level return type or extend the return to include scenario-level metadata:

```typescript
export interface ParsedScenario {
  metadata: Record<string, string>;  // scenario-level tags (before first heading)
  sections: WikiSection[];
}
```

- During parsing, detect lines matching `/<!--@\s*(\w+):\s*(.+?)\s*@-->/` and:
  - If no heading has been encountered yet, store in scenario-level metadata
  - Otherwise, attach to the **next** section (buffer them until the next heading appears)
- Strip these comment lines from body content so they don't appear in HTML output

### 2. Resolve background images with inheritance (`src/lib/parseWikitext.ts`)

Add a post-parse helper:

```typescript
export function resolveBackgroundImage(
  section: WikiSection, 
  ancestorBg: string | null
): string | null
```

The `WikiSectionTree` component will pass the resolved background down the tree. A section uses its own `metadata.background_image` if present, otherwise inherits from its parent.

### 3. Update `WikiSectionTree` to display backgrounds (`src/components/WikiSectionTree.tsx`)

- `SectionNode` receives a `parentBackground: string | null` prop
- Computes `effectiveBg = section.metadata.background_image || parentBackground`
- When a section is active and has an `effectiveBg`, render it as a CSS background on the section wrapper div (subtle overlay so text remains readable)
- Pass `effectiveBg` to children as their `parentBackground`

### 4. Update consumers (`src/pages/HostGame.tsx`, `src/pages/PlayGame.tsx`)

- Change `parseWikitext()` call to return `ParsedScenario` 
- Pass `sections` and scenario-level `metadata` (e.g. `scenario_level`) as needed
- Scenario-level metadata like `scenario_level` can be displayed in the header

