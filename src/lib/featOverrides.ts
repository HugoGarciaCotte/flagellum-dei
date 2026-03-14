import { supabase } from "@/integrations/supabase/client";
import type { Feat, FeatMeta } from "@/data/feats";

/** field name → JSONB value */
export type FeatOverrideMap = Map<string, Map<string, any>>;

let _overrides: FeatOverrideMap | null = null;
let _loading: Promise<FeatOverrideMap> | null = null;

const META_FIELDS = new Set([
  "description", "prerequisites", "special", "specialities",
  "subfeats", "unlocks_categories", "blocking", "synonyms",
]);

/** Fetch all feat_overrides from DB. Caches in memory. */
export async function loadFeatOverrides(): Promise<FeatOverrideMap> {
  if (_overrides) return _overrides;
  if (_loading) return _loading;
  _loading = (async () => {
    const map: FeatOverrideMap = new Map();
    const { data } = await supabase
      .from("feat_overrides")
      .select("feat_id, field, value");
    if (data) {
      for (const row of data) {
        if (!map.has(row.feat_id)) map.set(row.feat_id, new Map());
        map.get(row.feat_id)!.set(row.field, row.value);
      }
    }
    _overrides = map;
    _loading = null;
    return map;
  })();
  return _loading;
}

/** Get cached overrides (returns null if not yet loaded). */
export function getCachedOverrides(): FeatOverrideMap | null {
  return _overrides;
}

/** Invalidate cache so next loadFeatOverrides re-fetches. */
export function invalidateOverrides() {
  _overrides = null;
  _loading = null;
}

/** Apply DB overrides to a single feat. */
export function applyOverrides(feat: Feat, overrides: FeatOverrideMap): Feat {
  const fields = overrides.get(feat.id);
  if (!fields || fields.size === 0) return feat;

  const result = { ...feat };
  const meta: FeatMeta = { ...(feat.meta || {}) };

  for (const [field, value] of fields) {
    if (field === "title") result.title = value;
    else if (field === "categories") result.categories = value;
    else if (META_FIELDS.has(field)) {
      (meta as any)[field] = value;
    }
  }

  result.meta = meta;
  return result;
}

/** Check if a feat has any DB overrides. */
export function hasOverrides(featId: string, overrides: FeatOverrideMap): boolean {
  const fields = overrides.get(featId);
  return !!fields && fields.size > 0;
}
