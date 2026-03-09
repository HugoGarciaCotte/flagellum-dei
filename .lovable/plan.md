

## Fix FeatDetailsDisplay: Use rawContent for Parsing, content for Display

### Problem
- `parseFeatFields(content)` fails because `content` is expanded wikitext, not a `{{Feats|...}}` template
- The `fullHtml` memo also tries to parse `content` as a template — fails for the same reason
- Meanwhile `rawContent` has the template data but isn't used for field parsing

### Changes in `src/components/FeatDetailsDisplay.tsx`

1. **Field parsing** — use `rawContent` for structured extraction:
   - `parseFeatFields(rawContent || content)` instead of `parseFeatFields(content)`

2. **fullHtml memo** — render `content` as plain wikitext (it's already expanded markup), not as a template:
   - Simply split `content` by newlines and pass through `convertBodyToHtml`
   - Strip `<!--` comments before rendering
   - Remove the template-stripping logic (`{{Feats` wrapper, `|` field splitting)

3. **Visibility** — update `hasFields` / null check to account for `content` always producing output when non-empty

