export interface FeatFields {
  description: string | null;
  special: string | null;
  prerequisites: string | null;
  synonyms: string | null;
}

function stripWikiLinks(text: string): string {
  // [[target|label]] → label, [[target]] → target
  return text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
}

/**
 * Parse a {{Feats | field = value }} MediaWiki template into structured fields.
 */
export function parseFeatFields(content: string | null | undefined): FeatFields {
  const empty: FeatFields = { description: null, special: null, prerequisites: null, synonyms: null };
  if (!content) return empty;

  // Remove the outer {{Feats ... }} wrapper
  const inner = content
    .replace(/^\s*\{\{\s*Feats\s*/i, "")
    .replace(/\}\}\s*$/, "");

  // Split on top-level `| FieldName =` boundaries
  const fieldRe = /^\|\s*([^=]+?)\s*=\s*/gm;
  const fields: { name: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(inner)) !== null) {
    fields.push({ name: m[1].trim(), start: m.index + m[0].length });
  }

  const fieldMap: Record<string, string> = {};
  for (let i = 0; i < fields.length; i++) {
    const end = i + 1 < fields.length ? fields[i + 1].start - (inner.slice(0, fields[i + 1].start).match(/\|\s*[^=]+?=\s*$/)?.[0]?.length ?? 0) : inner.length;
    const rawValue = inner.slice(fields[i].start, fields[i + 1]?.start !== undefined ? inner.lastIndexOf("|", fields[i + 1].start) : inner.length).trim();
    fieldMap[fields[i].name.toLowerCase()] = rawValue;
  }

  // Simpler approach: re-parse by splitting on `\n|`
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
    description: desc ? stripWikiLinks(desc) : null,
    special: cleanSpecial ? stripWikiLinks(cleanSpecial) : null,
    prerequisites: prereqs ? stripWikiLinks(prereqs) : null,
    synonyms: synonyms ? stripWikiLinks(synonyms) : null,
  };
}
