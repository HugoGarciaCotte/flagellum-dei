

## Broadcast Dice Rolls via Realtime

### Approach

Use Supabase Realtime **Broadcast** (no database table needed) to send dice roll events to all participants in a game channel. When someone rolls, broadcast a message with the roller's name, result, and whether they're the GM. Other clients listen and show a toast.

### Changes

**`src/components/DiceRoller.tsx`**
- Accept new props: `gameId`, `userName`, `isGameMaster`
- After the roll settles (in `showResult`), broadcast via Supabase Realtime:
  ```ts
  supabase.channel(`dice-${gameId}`).send({
    type: "broadcast",
    event: "dice-roll",
    payload: { userName, result, isGameMaster }
  })
  ```
- On mount, subscribe to the `dice-${gameId}` channel and listen for `dice-roll` events from others
- When receiving a roll event, show a toast:
  - If `isGameMaster`: "The Game Master rolled a dice" (no result shown)
  - Otherwise: "{userName} rolled a {result}"
- Filter out own rolls (compare user id or use a roll id)

**`src/pages/HostGame.tsx`**
- Pass `gameId`, user's display name (or "Game Master"), and `isGameMaster={true}` to `<DiceRoller />`

**`src/pages/PlayGame.tsx`**
- Fetch user's display name from profiles (or selected character name)
- Pass `gameId`, display name, and `isGameMaster={false}` to `<DiceRoller />`

### DiceRoller prop changes

```ts
interface DiceRollerProps {
  gameId?: string;
  userName?: string;
  isGameMaster?: boolean;
}
```

When `gameId` is provided, the component subscribes to the broadcast channel and sends roll events. When absent (e.g. used outside a game), it works as before with no broadcasting.

### No database changes needed
Supabase Broadcast is ephemeral — no tables, no RLS policies required.

