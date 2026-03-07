
-- Step 1: Merge existing column values into content as <!--@ ... @--> tags
-- This function builds a parseable block from the columns and appends/merges it into content
DO $$
DECLARE
  feat_row RECORD;
  block TEXT;
  lines TEXT[];
  s JSONB;
  slot_parts TEXT[];
BEGIN
  FOR feat_row IN SELECT id, title, content, description, subfeats, specialities, unlocks_categories FROM public.feats LOOP
    lines := ARRAY[]::TEXT[];

    -- description -> feat_one_liner
    IF feat_row.description IS NOT NULL AND trim(feat_row.description) != '' THEN
      -- Only add if not already in content as a tag
      IF feat_row.content IS NULL OR feat_row.content NOT LIKE '%feat_one_liner%' THEN
        lines := array_append(lines, '<!--@ feat_one_liner: ' || trim(feat_row.description) || ' @-->');
      END IF;
    END IF;

    -- specialities -> feat_specialities
    IF feat_row.specialities IS NOT NULL AND array_length(feat_row.specialities, 1) > 0 THEN
      IF feat_row.content IS NULL OR feat_row.content NOT LIKE '%feat_specialities%' THEN
        lines := array_append(lines, '<!--@ feat_specialities: ' || array_to_string(feat_row.specialities, ', ') || ' @-->');
      END IF;
    END IF;

    -- subfeats -> feat_subfeat:N tags
    IF feat_row.subfeats IS NOT NULL AND jsonb_array_length(feat_row.subfeats) > 0 THEN
      IF feat_row.content IS NULL OR feat_row.content NOT LIKE '%feat_subfeat:%' THEN
        FOR s IN SELECT * FROM jsonb_array_elements(feat_row.subfeats) LOOP
          slot_parts := ARRAY[(s->>'kind')::TEXT];
          IF (s->>'optional')::BOOLEAN = true THEN
            slot_parts := array_append(slot_parts, 'optional');
          END IF;
          IF s->>'kind' = 'fixed' AND s->>'feat_title' IS NOT NULL THEN
            slot_parts := array_append(slot_parts, s->>'feat_title');
          ELSIF s->>'kind' = 'list' AND s->'options' IS NOT NULL THEN
            slot_parts := array_append(slot_parts, (SELECT string_agg(elem::TEXT, '|') FROM jsonb_array_elements_text(s->'options') AS elem));
          ELSIF s->>'kind' = 'type' AND s->>'filter' IS NOT NULL THEN
            slot_parts := array_append(slot_parts, s->>'filter');
          END IF;
          lines := array_append(lines, '<!--@ feat_subfeat:' || (s->>'slot')::TEXT || ': ' || array_to_string(slot_parts, ', ') || ' @-->');
        END LOOP;
      END IF;
    END IF;

    -- unlocks_categories -> feat_unlocks
    IF feat_row.unlocks_categories IS NOT NULL AND array_length(feat_row.unlocks_categories, 1) > 0 THEN
      IF feat_row.content IS NULL OR feat_row.content NOT LIKE '%feat_unlocks%' THEN
        lines := array_append(lines, '<!--@ feat_unlocks: ' || array_to_string(feat_row.unlocks_categories, ', ') || ' @-->');
      END IF;
    END IF;

    -- Build block and merge into content
    IF array_length(lines, 1) > 0 THEN
      block := E'<!--@ PARSEABLE FIELDS START @-->\n' || array_to_string(lines, E'\n') || E'\n<!--@ PARSEABLE FIELDS END @-->';

      IF feat_row.content IS NOT NULL AND feat_row.content LIKE '%PARSEABLE FIELDS START%' THEN
        -- Replace existing block
        UPDATE public.feats SET content = regexp_replace(
          feat_row.content,
          '<!--@ PARSEABLE FIELDS START @-->.*?<!--@ PARSEABLE FIELDS END @-->',
          block,
          's'
        ) WHERE id = feat_row.id;
      ELSIF feat_row.content IS NOT NULL THEN
        UPDATE public.feats SET content = trim(feat_row.content) || E'\n\n' || block WHERE id = feat_row.id;
      ELSE
        UPDATE public.feats SET content = block WHERE id = feat_row.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 2: Drop the columns
ALTER TABLE public.feats DROP COLUMN IF EXISTS description;
ALTER TABLE public.feats DROP COLUMN IF EXISTS subfeats;
ALTER TABLE public.feats DROP COLUMN IF EXISTS specialities;
ALTER TABLE public.feats DROP COLUMN IF EXISTS unlocks_categories;
