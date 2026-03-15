

## Inline Queue Track Buttons at Tag Position

### Problem
Currently, `<!--@ queue_track: url | name @-->` tags are stripped from content during parsing (line 257: `continue; // Don't add to body`), and all queue tracks are collected via `collectQueueTracks()` from `section.metadata` and rendered as a block at the bottom of the last content segment. The user wants the play button to appear **inline** where the tag was written in the wikitext.

### Approach

**`src/lib/parseWikitext.ts`** — Instead of skipping `queue_track` meta tags entirely, inject an HTML placeholder into the body content:

1. In the main parse loop (around line 251-258), when a `queue_track` meta tag is found and `currentTarget` exists, **also** append an inline HTML marker to the current body, e.g.:
   ```html
   <span class="wiki-queue-track" data-url="..." data-name="..."></span>
   ```
2. Still store it in metadata for backward compat, but the visual rendering will come from the HTML.

**`src/components/WikiSectionTree.tsx`** — Render inline queue track buttons from the HTML content:

1. In the `useEffect` that styles `.wiki-feat-link` elements (around line 116), also find `.wiki-queue-track` spans and style them or replace them with play button markup.
2. Alternatively, use a `useEffect` + event delegation pattern: after content renders, query all `.wiki-queue-track` elements and attach click handlers that call `onPlayTrack`.
3. Remove the bottom-of-section `queueTracks.map(...)` block (lines ~237-253) since buttons now appear inline.

### Details

In `parseWikitext.ts`, around line 251:
```ts
if (hasMetaTags && isMetaOnlyLine(line)) {
  if (!seenHeading) {
    Object.assign(scenarioMeta, lineMeta);
  } else if (currentTarget) {
    Object.assign(currentTarget.metadata, lineMeta);
    // Inject inline HTML for queue_track tags
    if (lineMeta.queue_track) {
      for (const entry of lineMeta.queue_track.split(",")) {
        const [url, name] = entry.split("|").map(s => s.trim());
        if (url) {
          currentBodyLines.push(`<span class="wiki-queue-track" data-url="${url}" data-name="${name || url}"></span>`);
        }
      }
    }
  }
  continue;
}
```

In `WikiSectionTree.tsx` `SectionNode`:
- Add a `useEffect` that queries `.wiki-queue-track` spans in the rendered content and injects play button UI (icon + name text) into each.
- Add a click handler via event delegation on the content div that catches clicks on `.wiki-queue-track` and calls `onPlayTrack(url)`.
- Remove the collected `queueTracks` block at the bottom of content segments.

