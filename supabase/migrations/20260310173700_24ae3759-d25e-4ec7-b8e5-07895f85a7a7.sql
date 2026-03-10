-- Drop foreign key constraints referencing legacy tables
ALTER TABLE character_feats DROP CONSTRAINT IF EXISTS character_feats_feat_id_fkey;
ALTER TABLE character_feat_subfeats DROP CONSTRAINT IF EXISTS character_feat_subfeats_subfeat_id_fkey;
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_scenario_id_fkey;

-- Drop legacy tables
DROP TABLE IF EXISTS feat_redirects;
DROP TABLE IF EXISTS feats;
DROP TABLE IF EXISTS scenarios;