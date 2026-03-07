export interface FeatFields {
  description: string | null;
  special: string | null;
  prerequisites: string | null;
  synonyms: string | null;
}

function stripWikiLinks(text: string): string {
  return text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
}

/**
 * Parse a {{Feats | field = value }} MediaWiki template into structured fields.
 */
export function parseFeatFields(content: string | null | undefined): FeatFields {
  const empty: FeatFields = { description: null, special: null, prerequisites: null, synonyms: null };
  if (!content) return empty;

  const inner = content
    .replace(/^\s*\{\{\s*Feats\s*/i, "")
    .replace(/\}\}\s*$/, "");

  const result: Record<string, string> = {};
  const parts = ("\n" + inner).split(/\n\|\s*/);
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim().toLowerCase();
    const value = part.slice(eqIdx + 1).trim();
    result[key] = value;
  }

  const desc = result["description"] || null;
  const special = result["special"] || null;
  const prereqs = result["prowess prerequisites"] || null;
  const synonyms = result["synonyms"] || null;

  const cleanSpecial = special && special.toLowerCase().includes("leave blank if none") ? null : special;

  return {
    description: desc || null,
    special: cleanSpecial || null,
    prerequisites: prereqs || null,
    synonyms: synonyms ? stripWikiLinks(synonyms) : null,
  };
}
