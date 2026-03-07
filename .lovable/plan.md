

## Conditionally Show Status Icons

### Change in `src/components/ManageFeats.tsx`

Only render the Subfeats/Specialities status icons when the feat has them (green state). Hide them entirely otherwise.

```tsx
// Before
<div className="flex items-center gap-3 mt-1.5">
  <StatusIcon ok={hasSubfeats(f)} label="Subfeats" />
  <StatusIcon ok={hasSpecialities(f)} label="Specialities" />
</div>

// After — only show when present, hide the wrapper div if neither exists
{(hasSubfeats(f) || hasSpecialities(f)) && (
  <div className="flex items-center gap-3 mt-1.5">
    {hasSubfeats(f) && <StatusIcon ok={true} label="Subfeats" />}
    {hasSpecialities(f) && <StatusIcon ok={true} label="Specialities" />}
  </div>
)}
```

Single file change: `src/components/ManageFeats.tsx`

