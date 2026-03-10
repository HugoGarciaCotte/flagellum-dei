import featsData from "./feats-data.json";

export interface Feat {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
}

export interface FeatRedirect {
  from_title: string;
  to_title: string;
}

const typedFeats: Feat[] = featsData.feats as Feat[];
const typedRedirects: FeatRedirect[] = featsData.redirects as FeatRedirect[];

export const getAllFeats = (): Feat[] => typedFeats;

export const getFeatById = (id: string): Feat | undefined =>
  typedFeats.find((f) => f.id === id);

export const getFeatByTitle = (title: string): Feat | undefined =>
  typedFeats.find((f) => f.title.toLowerCase() === title.toLowerCase());

export const getAllFeatRedirects = (): FeatRedirect[] => typedRedirects;

/**
 * Build a Map<lowercase_title, Feat> with redirects resolved.
 * Used by WikiLinkedText, FeatDetailsDisplay, WikiSectionTree for hover tooltips.
 */
export function buildFeatsMap(): Map<string, Feat> {
  const map = new Map<string, Feat>();
  typedFeats.forEach((f) => map.set(f.title.toLowerCase(), f));
  typedRedirects.forEach((r) => {
    const target = map.get(r.to_title.toLowerCase());
    if (target) map.set(r.from_title.toLowerCase(), target);
  });
  return map;
}
