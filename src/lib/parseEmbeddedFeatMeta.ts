export interface EmbeddedFeatMeta {
  description: string | null;
  specialities: string[] | null;
  subfeats: SubfeatSlot[] | null;
  unlocks_categories: string[] | null;
}

export interface SubfeatSlot {
  slot: number;
  kind: "fixed" | "list" | "type";
  feat_title?: string;
  options?: string[];
  filter?: string;
  optional?: boolean;
}

/**
 * Parse <!--@ ... @--> metadata tags embedded in feat content.
 * Works both in browser and Deno edge functions.
 */
export function parseEmbeddedFeatMeta(content: string | null | undefined): EmbeddedFeatMeta {
  const result: EmbeddedFeatMeta = {
    description: null,
    specialities: null,
    subfeats: null,
    unlocks_categories: null,
  };

  if (!content) return result;

  const tagRegex = /<!--@\s*([\w:]+)\s*:\s*(.*?)\s*@-->/g;
  let match: RegExpExecArray | null;
  const subfeatSlots: SubfeatSlot[] = [];

  while ((match = tagRegex.exec(content)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();

    if (key === "feat_one_liner") {
      result.description = value;
    } else if (key === "feat_specialities") {
      result.specialities = value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (key === "feat_unlocks") {
      result.unlocks_categories = value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (key.startsWith("feat_subfeat:")) {
      const slotNum = parseInt(key.split(":")[1], 10);
      if (isNaN(slotNum)) continue;

      const parts = value.split(",").map((s) => s.trim());
      if (parts.length < 2) continue;

      const kind = parts[0] as "fixed" | "list" | "type";
      let optional = false;
      let valueStart = 1;

      if (parts[1] === "optional") {
        optional = true;
        valueStart = 2;
      }

      const rest = parts.slice(valueStart).join(",").trim();
      const slot: SubfeatSlot = { slot: slotNum, kind, optional };

      if (kind === "fixed") {
        slot.feat_title = rest;
      } else if (kind === "list") {
        slot.options = rest.split("|").map((s) => s.trim()).filter(Boolean);
      } else if (kind === "type") {
        slot.filter = rest;
      }

      subfeatSlots.push(slot);
    }
  }

  if (subfeatSlots.length > 0) {
    result.subfeats = subfeatSlots.sort((a, b) => a.slot - b.slot);
  }

  return result;
}

/**
 * Generate a <!--@ PARSEABLE FIELDS @--> block from metadata.
 */
export function generateParseableBlock(meta: {
  description?: string | null;
  specialities?: string[] | null;
  subfeats?: SubfeatSlot[] | null;
  unlocks_categories?: string[] | null;
}): string {
  const lines: string[] = [];

  if (meta.description?.trim()) {
    lines.push(`<!--@ feat_one_liner: ${meta.description.trim()} @-->`);
  }
  if (meta.specialities && meta.specialities.length > 0) {
    lines.push(`<!--@ feat_specialities: ${meta.specialities.join(", ")} @-->`);
  }
  if (meta.subfeats && meta.subfeats.length > 0) {
    for (const s of meta.subfeats) {
      const parts: string[] = [s.kind];
      if (s.optional) parts.push("optional");
      if (s.kind === "fixed" && s.feat_title) parts.push(s.feat_title);
      else if (s.kind === "list" && s.options) parts.push(s.options.join("|"));
      else if (s.kind === "type" && s.filter) parts.push(s.filter);
      lines.push(`<!--@ feat_subfeat:${s.slot}: ${parts.join(", ")} @-->`);
    }
  }
  if (meta.unlocks_categories && meta.unlocks_categories.length > 0) {
    lines.push(`<!--@ feat_unlocks: ${meta.unlocks_categories.join(", ")} @-->`);
  }

  if (lines.length === 0) return "";
  return `<!--@ PARSEABLE FIELDS START @-->\n${lines.join("\n")}\n<!--@ PARSEABLE FIELDS END @-->`;
}

/**
 * Merge a parseable block into existing content, replacing any existing block.
 */
export function mergeParseableBlock(existingContent: string, newBlock: string): string {
  const startMarker = "<!--@ PARSEABLE FIELDS START @-->";
  const endMarker = "<!--@ PARSEABLE FIELDS END @-->";

  const startIdx = existingContent.indexOf(startMarker);
  const endIdx = existingContent.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    const before = existingContent.substring(0, startIdx).trimEnd();
    const after = existingContent.substring(endIdx + endMarker.length).trimStart();
    if (!newBlock) return (before + (after ? "\n" + after : "")).trimEnd();
    return (before + "\n" + newBlock + (after ? "\n" + after : "")).trimEnd();
  }

  if (!newBlock) return existingContent;
  return existingContent.trimEnd() + "\n\n" + newBlock;
}
