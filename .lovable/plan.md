

## Default character name: "New Character"

One-line fix in `src/components/CharacterCreationWizard.tsx`:

**Line 47**: Change the initial `name` state from `""` to `"New Character"`:
```tsx
const [name, setName] = useState("New Character");
```

The progressive save on line 177 already uses `"New Character"` as the default, so this just makes the input field consistent with what's saved.

