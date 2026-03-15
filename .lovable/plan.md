

## Fix: Remove Scroll-Blocking Overlay from Spotify Player

**Approach**: Replace the `fixed inset-0` overlay div with a click-outside `useEffect` listener. This is the standard pattern — no new dependencies, minimal change.

### Changes in `src/components/SpotifyPlayer.tsx`

1. **Add a ref** for the expanded panel container:
   ```typescript
   const containerRef = useRef<HTMLDivElement>(null);
   ```

2. **Add a click-outside useEffect**:
   ```typescript
   useEffect(() => {
     if (!expanded) return;
     const handler = (e: MouseEvent | TouchEvent) => {
       if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
         setExpanded(false);
       }
     };
     document.addEventListener("mousedown", handler);
     document.addEventListener("touchstart", handler);
     return () => {
       document.removeEventListener("mousedown", handler);
       document.removeEventListener("touchstart", handler);
     };
   }, [expanded]);
   ```

3. **Remove the overlay div** (line 320):
   ```tsx
   // DELETE: <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
   ```

4. **Attach `containerRef`** to the expanded panel's outer `<div>`.

One file, ~10 lines changed.

