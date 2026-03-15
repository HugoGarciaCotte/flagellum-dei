

## Add Word-Level Highlighting to Diff View

### Problem
The current diff works at the **line level** only — if one word changes in a paragraph, the entire line shows as removed + added with no indication of *what* changed within it. You want inline highlighting of the specific words/characters that differ.

### Solution

Two improvements to `src/components/AiImprovePanel.tsx`:

1. **Pair removed+added lines into "modified" hunks**: When a removed line is immediately followed by an added line (common when the AI rewrites a sentence), treat them as a single "modified" row displayed side-by-side instead of two separate rows.

2. **Word-level highlight within modified rows**: For these paired rows, run a second word-level diff (split by whitespace) to highlight only the changed words with colored backgrounds — red strikethrough on the old side, green highlight on the new side. Unchanged words stay neutral.

### Implementation

**`src/components/AiImprovePanel.tsx`** — ~60 lines of changes:

- Add a `computeWordDiff(oldLine, newLine)` function that splits both strings by spaces, runs a small LCS on the word arrays, and returns spans with `"equal" | "added" | "removed"` tags.
- After `computeDiff`, post-process the result to merge consecutive `removed` → `added` pairs into a new `kind: "modified"` type that carries both `oldLine` and `newLine`.
- Update `DiffRow` to handle the `"modified"` kind: render old side with word-level red highlights, new side with word-level green highlights, both on the same row.
- Keep standalone added/removed lines (insertions/deletions) as they are.

### Visual result
```text
ORIGINAL                          PROPOSED
The knight entered the castle.    The knight entered the cathedral.
       (no highlight)                              ^^^^^^^^^^^ green
```

Only the differing words get colored, making modifications immediately obvious even in long paragraphs.

### Files
1. `src/components/AiImprovePanel.tsx` — add word diff + merge paired lines + update DiffRow

