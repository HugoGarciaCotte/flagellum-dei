update public.characters c
set feats = (
  select jsonb_agg(
    case when f ? 'subfeats' then jsonb_set(f, '{subfeats}', (
      select jsonb_agg(
        case when s->>'feat_id' = 'dac8c2db-8e0b-4e98-bc05-ab556057e023'
          then jsonb_set(s, '{feat_id}', '"87903e2e-a69d-48b0-9580-631cc040369f"')
          else s end)
      from jsonb_array_elements(f->'subfeats') s))
    else f end)
  from jsonb_array_elements(c.feats) f),
  updated_at = now()
where c.id in ('478ca27e-3814-4f1e-8a45-1fc098b12d91','c68cbb29-7581-4a62-a224-cffd322e1e3f');