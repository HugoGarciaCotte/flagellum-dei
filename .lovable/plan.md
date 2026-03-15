

## Enforce minimum 16px font on body text (excluding homepage)

With 500+ instances of `text-sm`/`text-xs` across 50+ files, editing each individually is impractical and fragile. Instead, a CSS-based approach targets only readable/content text while leaving UI chrome (badges, pills, button labels) untouched.

### Approach — CSS min-font-size on the body

**`src/index.css`** — Add a rule that sets a minimum font size on common content elements (`p`, `li`, `label`, `span`, `td`, `th`) globally, then **opt out** on the homepage via a class.

```css
/* Minimum 16px for readable text — excludes badges, buttons, and homepage */
p, li, label, td, th,
.body-text {
  font-size: max(1rem, inherit);
}

/* Homepage keeps original sizing */
.home-page p,
.home-page li,
.home-page label,
.home-page td,
.home-page th,
.home-page .body-text {
  font-size: inherit;
}
```

This naturally skips:
- **Badges** (`<div>` with `text-xs`) — not a `p`/`li`/`label`
- **Buttons** — `<button>` not targeted
- **Status pills / icon labels** — typically `<span>` inside buttons or badge containers

However `span` is tricky — many body text elements use `<span>`. We need to be more selective.

### Revised, safer approach

Rather than a blanket CSS rule (which could have unintended side effects on spans inside badges etc.), the cleaner solution is:

**`src/pages/Home.tsx`** — Add `home-page` class to the root div.

**`src/index.css`** — Add:
```css
/* Enforce min 16px on readable content outside the homepage */
body:not(:has(.home-page)) p,
body:not(:has(.home-page)) li,
body:not(:has(.home-page)) label {
  font-size: max(1rem, inherit);
}
```

Actually `:has()` won't work well here since both Home and Dashboard render at `/` conditionally.

### Final approach — wrapper class

**`src/App.tsx`** — No changes needed.

**`src/pages/Home.tsx`** — Add a `data-page="home"` attribute to root div (already has classes, just add attribute).

**`src/index.css`** — Add a utility class and global override:

```css
/* Min 16px for readable text everywhere except homepage */
:root {
  --min-body-font: 1rem;
}

[data-page="home"] {
  --min-body-font: 0px;
}

p, li, label,
.readable-text {
  font-size: max(var(--min-body-font), inherit);
}
```

This is 2 files, ~10 lines of CSS, zero component edits. All `<p>`, `<li>`, and `<label>` elements automatically get minimum 16px except on the homepage. Badges (which use `<div>` or `<span>`) are unaffected.

### Changes

| File | Change |
|---|---|
| `src/index.css` | Add CSS custom property `--min-body-font` and apply `font-size: max(...)` to `p`, `li`, `label` |
| `src/pages/Home.tsx` | Add `data-page="home"` to root `<div>` |

### What's affected
- **Paragraphs** (`<p>`) — descriptions, instructions, form help text → bumped to 16px min
- **List items** (`<li>`) — install steps, FAQ answers → bumped to 16px min  
- **Labels** (`<label>`) — form labels → bumped to 16px min

### What's NOT affected
- Badges, pills, status tags (use `<div>`/`<span>`)
- Button text (use `<button>`)
- Headings (already ≥16px)
- Admin pages UI chrome
- Homepage (opted out via `data-page="home"`)

