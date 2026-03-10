

## Fix: GuestBanner crashes because it's outside the Router

**Problem**: In `App.tsx`, `<GuestBanner />` (and `<OfflineBanner />`) are rendered outside `<BrowserRouter>`. `GuestBanner` uses `<Link>` from react-router-dom, which requires Router context. This causes the runtime error `React2.useContext(...) is null` and a black screen.

**Fix**: Move `<OfflineBanner />` and `<GuestBanner />` inside `<BrowserRouter>`:

```tsx
// App.tsx — move banners inside BrowserRouter
<BrowserRouter>
  <Routes>
    {/* ... routes ... */}
  </Routes>
  <OfflineBanner />
  <GuestBanner />
</BrowserRouter>
```

One-line move, no other changes needed.

