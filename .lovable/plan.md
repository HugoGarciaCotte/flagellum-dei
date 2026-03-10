

## Drop legacy tables and clean up unused storage

**Legacy tables to drop** (data now hardcoded in `src/data/`):
- `feats` — game feat definitions, now in `feats-data.json`
- `feat_redirects` — wiki redirects, now in `feats-data.json`
- `scenarios` — scenario content, now in `src/data/scenarios/`

Note: `character_feats` and `character_feat_subfeats` still reference `feats.id` via foreign keys. Those FKs were already removed (no FK constraints shown in the schema), but the types file still lists them. The migration will use `CASCADE` to drop cleanly.

Also need to drop the `games.scenario_id` FK to `scenarios` before dropping.

**app-assets bucket**: Contains only `pwa-icon-512.png` and `pwa-icon-192.png` — both are now static files in `public/`. No code references `app-assets` anywhere. The entire bucket can be emptied and deleted.

### Migration SQL

```sql
-- Drop foreign key constraints referencing legacy tables
ALTER TABLE character_feats DROP CONSTRAINT IF EXISTS character_feats_feat_id_fkey;
ALTER TABLE character_feat_subfeats DROP CONSTRAINT IF EXISTS character_feat_subfeats_subfeat_id_fkey;
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_scenario_id_fkey;

-- Drop legacy tables (and their RLS policies cascade automatically)
DROP TABLE IF EXISTS feat_redirects;
DROP TABLE IF EXISTS feats;
DROP TABLE IF EXISTS scenarios;
```

### Post-migration
- Delete objects from `app-assets` bucket and remove the bucket
- Update `src/integrations/supabase/types.ts` will auto-regenerate

