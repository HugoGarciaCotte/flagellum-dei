

## Show Active Games for Players (Not Just Hosts)

Currently, the "Your Active Games" section only queries games where `host_user_id = user.id`. Players who joined a game via code don't see it listed.

### Changes: `src/pages/Dashboard.tsx`

1. **Add a new query** for games the user has joined as a player:
   - Query `game_players` where `user_id = user.id`, join with `games` (filtering `status = 'active'`) and `scenarios(title)`
   
2. **Merge both lists** (hosted games + joined games) into the "Your Active Games" section, deduplicating by game ID.

3. **Differentiate navigation**: Hosted games navigate to `/game/{id}/host`, joined games navigate to `/game/{id}/play`.

4. **Add a subtle label** (e.g., "Hosting" vs "Playing") on each card so the user knows their role in each game.

### Implementation Detail

New query:
```typescript
const { data: joinedGames } = useQuery({
  queryKey: ["joined-games", user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("game_players")
      .select("game_id, games!inner(id, join_code, status, host_user_id, scenarios(title))")
      .eq("user_id", user!.id)
      .eq("games.status", "active");
    if (error) throw error;
    return data;
  },
  enabled: !!user,
});
```

In the render, combine `myGames` (hosted) and `joinedGames` (playing), show the section if either has entries. Each card navigates to the correct route based on whether the user is host or player, with a small badge indicating the role.

