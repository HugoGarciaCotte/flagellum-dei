import { supabase } from "@/integrations/supabase/client";
import type { Feat, FeatMeta } from "@/data/feats";

/** field name → JSONB value */
export type FeatOverrideMap = Map<string, Map<string, any>>;

let _overrides: FeatOverrideMap | null = null;
let _loading: Promise<FeatOverrideMap> | null = null;

// EDIT-01: include `transforms_to` so admin-saved transform targets apply at runtime.
const META_FIELDS = new Set([
  "description", "prerequisites", "special", "specialities",
  "subfeats", "unlocks_categories", "blocking", "synonyms", "exhaustion",
  "transforms_to",
]);

/**
 * SYNC-15: propagate load errors (never cache a failed load) and notify
 * subscribers when overrides refresh.
 */
export async function loadFeatOverrides(): Promise<FeatOverrideMap> {
  if (_overrides) return _overrides;
  if (_loading) return _loading;
  _loading = (async () => {
    const map: FeatOverrideMap = new Map();
    const { data, error } = await supabase
      .from("feat_overrides")
      .select("feat_id, field, value");
    if (error) {
      _loading = null;
      throw error;
    }
    if (data) {
      for (const row of data) {
        if (!map.has(row.feat_id)) map.set(row.feat_id, new Map());
        map.get(row.feat_id)!.set(row.field, row.value);
      }
    }
    _overrides = map;
    _loading = null;
    try { window.dispatchEvent(new CustomEvent("overrides-change")); } catch {}
    return map;
  })();
  return _loading;
}

export function getCachedOverrides(): FeatOverrideMap | null {
  return _overrides;
}

export function invalidateOverrides() {
  _overrides = null;
  _loading = null;
}

export function applyOverrides(feat: Feat, overrides: FeatOverrideMap): Feat {
  const fields = overrides.get(feat.id);
  if (!fields || fields.size === 0) return feat;

  const result = { ...feat };
  const meta: FeatMeta = { ...(feat.meta || {}) };
  const fr: Record<string, string> = { ...(feat.fr || {}) } as any;
  let hasFr = !!feat.fr;

  for (const [field, value] of fields) {
    if (field.startsWith("fr:")) {
      const realField = field.slice(3);
      (fr as any)[realField] = value;
      hasFr = true;
    } else if (field === "title") result.title = value;
    else if (field === "categories") result.categories = value;
    else if (META_FIELDS.has(field)) {
      (meta as any)[field] = value;
    }
  }

  result.meta = meta;
  if (hasFr) result.fr = fr as any;
  return result;
}

export function hasOverrides(featId: string, overrides: FeatOverrideMap): boolean {
  const fields = overrides.get(featId);
  return !!fields && fields.size > 0;
}
