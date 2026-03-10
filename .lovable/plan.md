

## Add Join Code to Player View

Add a copyable join code button to the `PageHeader` on `PlayGame.tsx`, matching the same style used in `HostGame.tsx`.

### Changes

**`src/pages/PlayGame.tsx`**
- Import `Copy` from lucide-react
- Add a `copyCode` function using `navigator.clipboard.writeText`
- Add `rightActions` to the `<PageHeader>` with the join code button (same outline button with Copy icon + monospace code as in HostGame)
- Use `effectiveGame.join_code` for the displayed/copied value

