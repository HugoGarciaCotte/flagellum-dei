

## Improve Feat List Buttons: Remove Chevrons, Better Labels

### Changes

#### 1. `src/components/FeatListItem.tsx`
- **Non-picker mode** (no `onQuickAction`): Remove the implicit click-to-expand on the entire card. Instead, add an explicit button on the right side that says **"Info"** when collapsed and **"Hide"** when expanded.
- **Picker mode** (has `onQuickAction`): Rename **"Take"** → **"Select"** and **"Details"** → **"Info"** (collapsed) / **"Hide"** (expanded).
- The card itself is never clickable anymore — always use explicit buttons.

#### 2. `src/components/ManageFeats.tsx`
- Replace the `ChevronDown` icon inside the `CollapsibleTrigger` with a small **"Info"/"Hide"** button pattern, consistent with FeatListItem.
- The card row itself stays clickable (it's an admin tool), but remove the chevron icon.

#### 3. `src/components/CharacterFeatPicker.tsx`
- Update `quickActionLabel` from `"Take"` to `"Select"`.

### UI Result
```
Picker:    [ Feat Title  [Combat]     [Select] [Info] ]
                                      [Select] [Hide] ]  ← when expanded

Non-picker: [ Feat Title  [Combat]          [Info] ]
            [ Feat Title  [Combat]          [Hide] ]  ← when expanded
```

