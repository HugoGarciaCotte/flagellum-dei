

## Move Playlist Name Inline with Section Title

Currently the playlist name is shown as a separate badge/chip at the far right of the section header row (line 199-217), truncated to 100px. The user wants it right next to the section title, separated by a dash, with the full name visible.

### Changes

**`src/components/WikiSectionTree.tsx`** — Replace the separate playlist badge with inline text after the title (lines 195-217):

1. Move the playlist info inside the title `<span>` (or right after it), displayed as `Section Title — Playlist Name` with a Music icon and external link.
2. Remove the `max-w-[100px] truncate hidden sm:inline` constraints to show the full name.
3. Keep the link clickable to open in Spotify.

```tsx
{/* Replace lines 195-217 with: */}
<span className={cn("flex-1 flex items-center gap-1.5 flex-wrap", isActive ? "text-primary-foreground" : "text-foreground", TITLE_SIZES[section.level] || "text-sm")}>
  {section.title}
  {effectivePlaylist && (
    <a
      href={effectivePlaylist.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-normal transition-colors",
        isActive
          ? "text-primary-foreground/70 hover:text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      title={effectivePlaylist.name}
    >
      <span>—</span>
      <Music className="h-3 w-3 shrink-0" />
      <span>{effectivePlaylist.name}</span>
      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
    </a>
  )}
</span>
```

One file, ~20 lines changed. The playlist name now appears inline right after the section title with a dash separator, fully visible.

