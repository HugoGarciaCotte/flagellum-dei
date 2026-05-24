
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS feats jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill feats from existing rows.
-- For each character, aggregate non-deleted character_feats + their non-deleted subfeats.
WITH sub AS (
  SELECT cf.id AS cf_id,
         COALESCE(
           jsonb_agg(
             jsonb_build_object('slot', s.slot, 'feat_id', s.subfeat_id)
             ORDER BY s.slot
           ) FILTER (WHERE s.id IS NOT NULL),
           '[]'::jsonb
         ) AS subfeats
  FROM public.character_feats cf
  LEFT JOIN public.character_feat_subfeats s
    ON s.character_feat_id = cf.id AND s.deleted_at IS NULL
  WHERE cf.deleted_at IS NULL
  GROUP BY cf.id
),
agg AS (
  SELECT cf.character_id,
         jsonb_agg(
           jsonb_build_object(
             'level', cf.level,
             'feat_id', cf.feat_id,
             'is_free', cf.is_free,
             'note', cf.note,
             'subfeats', sub.subfeats
           )
           ORDER BY cf.is_free, cf.level
         ) AS feats
  FROM public.character_feats cf
  JOIN sub ON sub.cf_id = cf.id
  WHERE cf.deleted_at IS NULL
  GROUP BY cf.character_id
)
UPDATE public.characters c
SET feats = agg.feats
FROM agg
WHERE c.id = agg.character_id
  AND (c.feats IS NULL OR c.feats = '[]'::jsonb);
