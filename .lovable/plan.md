

## Remove Description & Content Status Icons

### Change in `src/components/ManageFeats.tsx`

Lines 297-298: Remove the "Description" and "Content" `StatusIcon` lines, keeping only Subfeats and Specialities.

```tsx
// Before (lines 296-301)
<div className="flex items-center gap-3 mt-1.5">
  <StatusIcon ok={hasDescription(f)} label="Description" />
  <StatusIcon ok={hasContent(f)} label="Content" />
  <StatusIcon ok={hasSubfeats(f)} label="Subfeats" />
  <StatusIcon ok={hasSpecialities(f)} label="Specialities" />
</div>

// After
<div className="flex items-center gap-3 mt-1.5">
  <StatusIcon ok={hasSubfeats(f)} label="Subfeats" />
  <StatusIcon ok={hasSpecialities(f)} label="Specialities" />
</div>
```

