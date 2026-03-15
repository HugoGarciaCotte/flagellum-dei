

## Add "Resume [Parent Section]" button after subsections

### Problem
When a parent section has content after a child subsection (segment index > 0), the GM must scroll back up to find the parent's Play button to reactivate its background.

### Solution
In `WikiSectionTree.tsx`, after rendering a child `SectionNode` and before the next content segment (when `i > 0` and the segment has content), render a small "▶ Resume {section.title}" button that calls `onActivateSection(section.id)`.

### Implementation — `src/components/WikiSectionTree.tsx`

In the `contentSegments` map (lines 180-208), when rendering segment `i > 0` with non-empty content, insert a resume button just before the content div:

```tsx
{i > 0 && seg.trim().length > 0 && (
  <button
    onClick={() => onActivateSection(section.id)}
    className={cn(
      "flex items-center gap-1.5 px-8 py-1 text-sm font-medium transition-colors",
      isActive ? "text-primary-foreground/70" : "text-primary"
    )}
  >
    <Play className="h-3 w-3 fill-current" />
    Resume {section.title}
  </button>
)}
```

### Files
| File | Change |
|------|--------|
| `src/components/WikiSectionTree.tsx` | Add "Resume" button before post-child content segments |

