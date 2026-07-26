import { supabase } from "@/integrations/supabase/client";
import type { Feat, FeatMeta } from "@/data/feats";

/** field name → JSONB value */
export type FeatOverrideMap = Map<string, Map<string, any>>;

let _overrides: FeatOverrideMap | null = null;
let _loading: Promise<FeatOverrideMap> | null = null;
let _generation = 0;

// EDIT-01: include `transforms_to` so admin-saved transform targets apply at runtime.
const META_FIELDS = new Set([
  "description", "prerequisites", "special", "specialities",
  "subfeats", "unlocks_categories", "blocking", "synonyms", "exhaustion",
  "transforms_to",
]);

async function fetchFeatOverrides(): Promise<FeatOverrideMap> {
  const map: FeatOverrideMap = new Map();
  const { data, error } = await supabase
    .from("feat_overrides")
    .select("feat_id, field, value");
  if (error) throw error;
  if (data) {
    for (const row of data) {
      if (!map.has(row.feat_id)) map.set(row.feat_id, new Map());
      map.get(row.feat_id)!.set(row.field, row.value);
    }
  }
  return map;
}

/**
 * SYNC-15: propagate load errors (never cache a failed load) and notify
 * subscribers when overrides refresh.
 */
export async function loadFeatOverrides(): Promise<FeatOverrideMap> {
  if (_overrides) return _overrides;
  if (_loading) return _loading;
  const gen = ++_generation; // B-24: stale loads can't overwrite newer ones.
  _loading = (async () => {
    try {
      const map = await fetchFeatOverrides();
      if (gen === _generation) {
        _overrides = map;
        try { window.dispatchEvent(new CustomEvent("overrides-change")); } catch {}
      }
      return map;
    } finally {
      _loading = null;
    }
  })();
  return _loading;
}

/**
 * B-05: non-destructive refresh — keeps the old cache during the fetch and
 * only swaps on success. Never nulls the cache mid-flight.
 */
export async function refreshFeatOverrides(): Promise<FeatOverrideMap> {
  const gen = ++_generation;
  try {
    const map = await fetchFeatOverrides();
    if (gen === _generation) {
      _overrides = map;
      try { window.dispatchEvent(new CustomEvent("overrides-change")); } catch {}
    }
    return map;
  } catch (e) {
    // Keep the old cache so consumers don't fall back to bundled content.
    throw e;
  }
}

export function getCachedOverrides(): FeatOverrideMap | null {
  return _overrides;
}

export function invalidateOverrides() {
  _overrides = null;
  _loading = null;
  _generation++;
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
