

## Add External Spotify Link Next to Track Buttons

### Change

**`src/lib/parseWikitext.ts`** (line 259): Append an external-link `<a>` after the button:

```typescript
const externalIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
currentBodyLines.push(`<button class="wiki-queue-track" data-url="${url}">${playIcon} ${name} ${musicIcon}</button><a class="wiki-track-external" href="${url}" target="_blank" rel="noopener">${externalIcon}</a>`);
```

**`src/index.css`**: Add `.wiki-track-external` styles — small muted icon link, visually separate from the button:

```css
.wiki-track-external {
  display: inline-flex;
  align-items: center;
  margin-left: 0.25rem;
  color: hsl(0 0% 50%);
  opacity: 0.6;
  transition: opacity 0.15s, color 0.15s;
}
.wiki-track-external:hover {
  opacity: 1;
  color: hsl(142 70% 75%);
}
.wiki-track-external svg {
  width: 14px;
  height: 14px;
}
```

2 files, ~15 lines total.

