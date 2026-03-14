

## Fix: Interleave Content and Children in Section Rendering

**Problem**: The renderer shows ALL section content first, then ALL children below. When `====` closes a subsection and content resumes in the parent (e.g., "EFG"), that content appears above the child section instead of below it.

```text
Current render:        Desired render:
Section 1              Section 1
  ABC + EFG              ABC
  Section 2              Section 2
    CDE                    CDE
                         EFG
```

**Root cause**: `WikiSection.content` is a single string, and the renderer dumps it all before children.

### Changes

**1. `src/lib/parseWikitext.ts` — Data model change**

Add `contentSegments: string[]` to `WikiSection`. Each segment holds the content that appears *before* the next child (or after the last child). Segment `[0]` = content before first child, `[1]` = content before second child, etc. The final segment = trailing content after all children.

- Initialize sections with `contentSegments: [""]` and keep `content: ""` for backward compatibility.
- In `flushBody()`, append to the *last* segment in `contentSegments`.
- When a new child heading is encountered within a parent, push a new empty segment to the parent's `contentSegments` (so subsequent content goes after that child).
- At the end, set `content = contentSegments.join("")` for backward compat.

**2. `src/components/WikiSectionTree.tsx` — Interleaved rendering**

Instead of rendering content then children, render them interleaved:

```tsx
{open && (
  <>
    {section.contentSegments.map((seg, i) => (
      <React.Fragment key={i}>
        {seg && <ContentBlock html={seg} ... />}
        {section.children[i] && <SectionNode section={section.children[i]} ... />}
      </React.Fragment>
    ))}
  </>
)}
```

This naturally places each content segment before its corresponding child, with trailing content at the end.

