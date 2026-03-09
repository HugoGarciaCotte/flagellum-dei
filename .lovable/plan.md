

## Fix: Wiki Bullet Points Not Rendering in Feat Descriptions

### Problem
The `WikiLinkedText` component only processes `[[links]]` and inline markup — it does **not** handle block-level wiki syntax like `* bullet points`. Fields like `description` and `special` pass raw wikitext through `WikiLinkedText`, which renders everything as a flat `<span>`, ignoring `*` list markers.

### Fix in `src/components/FeatDetailsDisplay.tsx`

For the `description` and `special` fields, instead of using `WikiLinkedText` (which only handles inline markup), use `convertBodyToHtml` to produce proper HTML (with `<ul>/<li>` for bullets) and render via `dangerouslySetInnerHTML` — the same approach already used for the `fullHtml` block at the bottom of the component.

The `prerequisites` field can stay as `WikiLinkedText` since it's typically a single line with links.

**Changes:**
1. For `fields.description` and `fields.special`, call `convertBodyToHtml(text.split("\n"))` to produce HTML with proper list rendering
2. Render the result with `dangerouslySetInnerHTML` inside a styled `div` (same prose classes as `fullHtml`)
3. Keep `WikiLinkedText` for `prerequisites` and `blocking` (single-line, link-heavy content)

