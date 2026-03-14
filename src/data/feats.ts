import featsData from "./feats-data.json";
import { parseEmbeddedFeatMeta, type SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";
import { parseFeatFields } from "@/lib/parseFeatContent";
import { getCachedOverrides, applyOverrides } from "@/lib/featOverrides";

export type { SubfeatSlot };

export interface FeatMeta {
  description?: string;
  prerequisites?: string;
  special?: string;
  specialities?: string[];
  subfeats?: SubfeatSlot[];
  unlocks_categories?: string[];
  blocking?: string[];
  synonyms?: string;
}

export interface Feat {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
  meta?: FeatMeta | null;
}

export interface FeatRedirect {
  from_title: string;
  to_title: string;
}

const typedFeats: Feat[] = featsData.feats as Feat[];
const typedRedirects: FeatRedirect[] = featsData.redirects as FeatRedirect[];

/** Returns all feats, with DB overrides applied if loaded. */
export const getAllFeats = (): Feat[] => {
  const overrides = getCachedOverrides();
  if (!overrides || overrides.size === 0) return typedFeats;
  return typedFeats.map(f => applyOverrides(f, overrides));
};

/** Returns the raw hardcoded feats without any overrides. */
export const getHardcodedFeats = (): Feat[] => typedFeats;

export const getFeatById = (id: string): Feat | undefined => {
  const overrides = getCachedOverrides();
  const feat = typedFeats.find((f) => f.id === id);
  if (!feat) return undefined;
  return overrides ? applyOverrides(feat, overrides) : feat;
};

export const getFeatByTitle = (title: string): Feat | undefined => {
  const all = getAllFeats();
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
export function buildFeatsMap(): Map<string, Feat> {
  const map = new Map<string, Feat>();
  const all = getAllFeats();
  all.forEach((f) => map.set(f.title.toLowerCase(), f));
  typedRedirects.forEach((r) => {
    const target = map.get(r.to_title.toLowerCase());
    if (target) map.set(r.from_title.toLowerCase(), target);
  });
  return map;
}
