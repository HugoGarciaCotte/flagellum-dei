

## Make join code label clearer

### Changes

**1. `src/i18n/en.ts`** — Add a `game.joinCode` label key:
- `"game.joinCode": "Join code"`

**2. `src/i18n/fr.ts`** — Add French equivalent:
- `"game.joinCode": "Code d'invitation"`

**3. `src/pages/HostGame.tsx`** (line 138-140) — Update the button to show the label before the code:
```tsx
<Button variant="outline" size="sm" onClick={copyCode} className="gap-2 border-primary/30 font-mono tracking-widest">
  <span className="font-sans font-medium tracking-normal">{t("game.joinCode")} :</span> {game.join_code} <Copy className="h-3 w-3" />
</Button>
```

**4. `src/pages/PlayGame.tsx`** (line 137-139) — Same treatment:
```tsx
<Button variant="outline" size="sm" onClick={copyCode} className="font-mono text-xs gap-1.5">
  <span className="font-sans font-medium tracking-normal">{t("game.joinCode")} :</span> {game.join_code} <Copy className="h-3.5 w-3.5" />
</Button>
```

Both buttons now read: **Join code : AB12XY** (with copy icon). Clicking still copies the full join URL.

