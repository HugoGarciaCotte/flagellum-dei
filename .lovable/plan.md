

## Fix Text Overflow on GM Host View

### Problem
Preformatted text (`<pre>` blocks from lines starting with a space in wikitext) overflows the card container because `<pre>` defaults to `white-space: pre` which prevents wrapping. The container is also narrow at `max-w-3xl`.

### Changes

#### 1. `src/components/WikiSectionTree.tsx` — Fix overflow
- Add `overflow-hidden` or `overflow-x-auto` to the section container div
- Add CSS for `<pre>` tags within the content: `[&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto`

#### 2. `src/pages/HostGame.tsx` — Widen container
- Change `max-w-3xl` to `max-w-5xl` to give more room for content

