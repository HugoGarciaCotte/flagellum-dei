import featsData from "./feats-data.json";
import { parseEmbeddedFeatMeta, type SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";
import { parseFeatFields } from "@/lib/parseFeatContent";
import { getCachedOverrides, applyOverrides } from "@/lib/featOverrides";

export type { SubfeatSlot };

export type ExhaustionType =
  | "infinite"
  | "once_forever"
  | "once_per_scenario"
  | "once_per_2_scenarios"
  | "once_per_3_scenarios"
  | "transforms_on_use";

export const EXHAUSTION_TYPES: ExhaustionType[] = [
  "infinite",
  "once_forever",
  "once_per_scenario",
  "once_per_2_scenarios",
  "once_per_3_scenarios",
  "transforms_on_use",
];


export interface FeatMeta {
  description?: string;
  prerequisites?: string;
  special?: string;
  specialities?: string[];
  subfeats?: SubfeatSlot[];
  unlocks_categories?: string[];
  blocking?: string[];
  synonyms?: string;
  exhaustion?: ExhaustionType;
}

/** Get the exhaustion type for a feat (defaults to "infinite"). */
export function getFeatExhaustion(feat: Feat | undefined | null): ExhaustionType {
  if (!feat) return "infinite";
  const meta = getFeatMeta(feat);
  return meta.exhaustion ?? "infinite";
}

export interface Feat {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
  meta?: FeatMeta | null;
  fr?: { title?: string; description?: string; prerequisites?: string; special?: string };
}

/** Apply locale to a feat — returns FR fields when available, else EN fallback. */
export function localizeFeat(feat: Feat, locale?: string): Feat {
  if (!locale || locale === "en" || !feat.fr) return feat;
  const result = { ...feat };
  if (feat.fr.title) result.title = feat.fr.title;
  if (feat.meta && (feat.fr.description || feat.fr.prerequisites || feat.fr.special)) {
    result.meta = {
      ...feat.meta,
      ...(feat.fr.description ? { description: feat.fr.description } : {}),
      ...(feat.fr.prerequisites ? { prerequisites: feat.fr.prerequisites } : {}),
      ...(feat.fr.special ? { special: feat.fr.special } : {}),
    };
  }
  return result;
}

export interface FeatRedirect {
  from_title: string;
  to_title: string;
}

const typedFeats: Feat[] = featsData.feats as Feat[];
const typedRedirects: FeatRedirect[] = featsData.redirects as FeatRedirect[];

/** Returns all feats, with DB overrides applied if loaded. */
export const getAllFeats = (locale?: string): Feat[] => {
  const overrides = getCachedOverrides();
  let feats = typedFeats;
  if (overrides && overrides.size > 0) feats = typedFeats.map(f => applyOverrides(f, overrides));
  if (locale && locale !== "en") return feats.map(f => localizeFeat(f, locale));
  return feats;
};

/** Returns the raw hardcoded feats without any overrides. */
export const getHardcodedFeats = (): Feat[] => typedFeats;

export const getFeatById = (id: string, locale?: string): Feat | undefined => {
  const overrides = getCachedOverrides();
  const feat = typedFeats.find((f) => f.id === id);
  if (!feat) return undefined;
  const withOverrides = overrides ? applyOverrides(feat, overrides) : feat;
  return locale ? localizeFeat(withOverrides, locale) : withOverrides;
};

export const getFeatByTitle = (title: string, locale?: string): Feat | undefined => {
  const all = getAllFeats(locale);
  return all.find((f) => f.title.toLowerCase() === title.toLowerCase());
};

export const getAllFeatRedirects = (): FeatRedirect[] => typedRedirects;

/**
 * Unified accessor: returns structured metadata for any feat.
 * If feat.meta exists, it takes priority. Otherwise falls back to parsing wikitext.
 */
export function getFeatMeta(feat: Feat): FeatMeta {
  if (feat.meta) return feat.meta;
  const embedded = parseEmbeddedFeatMeta(feat.raw_content || feat.content);
  const fields = parseFeatFields(feat.content);
  return {
    description: embedded.description ?? fields.description ?? undefined,
    prerequisites: embedded.prerequisites ?? fields.prerequisites ?? undefined,
    special: fields.special ?? undefined,
    specialities: embedded.specialities ?? undefined,
    subfeats: embedded.subfeats ?? undefined,
    unlocks_categories: embedded.unlocks_categories ?? undefined,
    blocking: embedded.blocking ?? undefined,
    synonyms: fields.synonyms ?? undefined,
  };
}

/**
 * Build a Map<lowercase_title, Feat> with redirects resolved.
 */
export function buildFeatsMap(locale?: string): Map<string, Feat> {
  const map = new Map<string, Feat>();
  const all = getAllFeats(locale);
  all.forEach((f) => map.set(f.title.toLowerCase(), f));
  typedRedirects.forEach((r) => {
    const target = map.get(r.to_title.toLowerCase());
    if (target) map.set(r.from_title.toLowerCase(), target);
  });
  return map;
}
