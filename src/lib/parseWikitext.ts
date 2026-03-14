export interface AmbianceEntry {
  minutes: number;
  text: string;
}

export interface WikiSection {
  id: string;
  title: string;
  level: number;
  content: string;
  contentSegments: string[];
  metadata: Record<string, string>;
  ambianceTrack?: AmbianceEntry[];
  children: WikiSection[];
}

export interface ParsedScenario {
  metadata: Record<string, string>;
  ambianceTrack?: AmbianceEntry[];
  sections: WikiSection[];
}

const HEADING_RE = /^(={1,6})\s*(.+?)\s*\1$/;
const META_RE = /<!--@\s*(\w+):\s*(.+?)\s*@-->/g;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function convertInlineMarkup(text: string): string {
  // Strip HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  // Strip bare category links: [[Category:X]]
  text = text.replace(/\[\[Category:[^\]]*\]\]/gi, "");
  // Category links with label: [[:Category:X|Label]] → plain text Label
  text = text.replace(/\[\[:Category:[^|\]]+\|([^\]]+)\]\]/gi, "$1");
  // Strip remaining [[:Category:X]] without label
  text = text.replace(/\[\[:Category:[^\]]*\]\]/gi, "");
  // Bold+Italic: '''''text'''''
  text = text.replace(/'''''(.+?)'''''/g, "<strong><em>$1</em></strong>");
  // Bold: '''text'''
  text = text.replace(/'''(.+?)'''/g, "<strong>$1</strong>");
  // Italic: ''text''
  text = text.replace(/''(.+?)''/g, "<em>$1</em>");
  // Internal links: [[target|label]] or [[target]] → hoverable spans
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<span class="wiki-feat-link" data-feat="$1">$2</span>');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '<span class="wiki-feat-link" data-feat="$1">$1</span>');
  // External links: [url text] or [url]
  text = text.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, '<a href="$1" target="_blank" rel="noopener">$2</a>');
  text = text.replace(/\[(https?:\/\/[^\s\]]+)\]/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  // Horizontal rule
  text = text.replace(/^----$/gm, "<hr>");
  return text;
}



type ListType = "ul" | "ol" | "dl";

function listTagFor(char: string): ListType {
  if (char === "#") return "ol";
  if (char === ";" || char === ":") return "dl";
  return "ul";
}

export function convertBodyToHtml(lines: string[]): string {
  const result: string[] = [];
  const listStack: ListType[] = [];
  let inPre = false;

  function closeListsTo(targetDepth: number) {
    while (listStack.length > targetDepth) {
      result.push(`</${listStack.pop()}>`);
    }
  }

  for (const line of lines) {
    if (line.startsWith(" ") && line.trim().length > 0) {
      closeListsTo(0);
      if (!inPre) { result.push("<pre>"); inPre = true; }
      result.push(convertInlineMarkup(line.slice(1)));
      continue;
    }
    if (inPre) { result.push("</pre>"); inPre = false; }

    const trimmed = line.trim();

    const listMatch = trimmed.match(/^([*#]+)(.*)/);
    if (listMatch) {
      const markers = listMatch[1];
      const content = listMatch[2].trim();
      const depth = markers.length;
      const tag = listTagFor(markers[0]);

      while (listStack.length > depth) {
        result.push(`</${listStack.pop()}>`);
      }
      if (listStack.length === depth && listStack[listStack.length - 1] !== tag) {
        result.push(`</${listStack.pop()}>`);
      }
      while (listStack.length < depth) {
        result.push(`<${tag}>`);
        listStack.push(tag);
      }
      result.push(`<li>${convertInlineMarkup(content)}</li>`);
      continue;
    }

    const dlMatch = trimmed.match(/^([;:])(.*)/);
    if (dlMatch) {
      const char = dlMatch[1];
      const content = dlMatch[2].trim();
      while (listStack.length > 0 && listStack[listStack.length - 1] !== "dl") {
        result.push(`</${listStack.pop()}>`);
      }
      if (listStack.length === 0) {
        result.push("<dl>");
        listStack.push("dl");
      }
      if (char === ";") {
        result.push(`<dt>${convertInlineMarkup(content)}</dt>`);
      } else {
        result.push(`<dd>${convertInlineMarkup(content)}</dd>`);
      }
      continue;
    }

    closeListsTo(0);

    if (trimmed.startsWith("----")) {
      result.push("<hr>");
      const rest = trimmed.slice(4).trim();
      if (rest) {
        result.push(`<p>${convertInlineMarkup(rest)}</p>`);
      }
      continue;
    }

    if (trimmed === "") {
      result.push("<br>");
    } else {
      result.push(`<p>${convertInlineMarkup(trimmed)}</p>`);
    }
  }

  if (inPre) result.push("</pre>");
  closeListsTo(0);

  return result.join("\n");
}

/**
 * Extract metadata tags from a line. Returns extracted key-value pairs.
 * Tags use the format: <!--@ key: value @-->
 */
function extractMetaTags(line: string): Record<string, string> {
  const tags: Record<string, string> = {};
  let match;
  const re = new RegExp(META_RE.source, "g");
  while ((match = re.exec(line)) !== null) {
    tags[match[1]] = match[2];
  }
  return tags;
}

/** Returns true if the line is purely meta tags (no other content). */
function isMetaOnlyLine(line: string): boolean {
  const stripped = line.replace(META_RE, "").trim();
  return stripped === "" && META_RE.test(line);
}

/** Parse an {{Ambiance Track ... }} block into AmbianceEntry[] */
function parseAmbianceBlock(block: string): AmbianceEntry[] {
  const entries: AmbianceEntry[] = [];
  // Match | Xmin = text  (captures digits before "min" and everything after "=")
  const entryRe = /\|\s*(\d+)\s*min\s*=\s*([\s\S]*?)(?=\|\s*\d+\s*min\s*=|\}\}|$)/g;
  let m;
  while ((m = entryRe.exec(block)) !== null) {
    const text = m[2].trim();
    if (text) {
      entries.push({ minutes: parseInt(m[1], 10), text });
    }
  }
  entries.sort((a, b) => a.minutes - b.minutes);
  return entries;
}

export function parseWikitext(wikitext: string): ParsedScenario {
  // Extract and strip {{Ambiance Track ... }} blocks before line-by-line parsing
  const ambianceBlockRe = /\{\{Ambiance\s+Track\s*([\s\S]*?)\}\}/gi;
  let scenarioAmbianceTrack: AmbianceEntry[] | undefined;
  // We'll track which blocks belong to which section after heading detection
  // Strategy: replace blocks with a special marker, then assign during parse
  const ambianceBlocks: AmbianceEntry[][] = [];
  const ambianceMarker = "<!--@@AMBIANCE_BLOCK_";
  const strippedWikitext = wikitext.replace(ambianceBlockRe, (match) => {
    const entries = parseAmbianceBlock(match);
    const idx = ambianceBlocks.length;
    ambianceBlocks.push(entries);
    return `${ambianceMarker}${idx}@@-->`;
  });

  const lines = strippedWikitext.split("\n");
  const root: WikiSection[] = [];
  const stack: { level: number; section: WikiSection; children: WikiSection[] }[] = [];
  let currentBodyLines: string[] = [];
  let currentTarget: WikiSection | null = null;

  // Scenario-level metadata (before first heading)
  const scenarioMeta: Record<string, string> = {};
  let seenHeading = false;

  // Buffer for meta tags that appear between sections
  

  function flushBody() {
    if (currentTarget && currentBodyLines.length > 0) {
      const html = convertBodyToHtml(currentBodyLines);
      currentTarget.content += html;
      currentTarget.contentSegments[currentTarget.contentSegments.length - 1] += html;
    }
    currentBodyLines = [];
  }

  for (const line of lines) {
    if (line.trimStart().startsWith("==>")) continue;

    // Check for meta tags
    const lineMeta = extractMetaTags(line);
    const hasMetaTags = Object.keys(lineMeta).length > 0;

    // Check for ambiance block markers
    const ambianceMarkerRe = /<!--@@AMBIANCE_BLOCK_(\d+)@@-->/;
    const ambianceMatch = line.match(ambianceMarkerRe);
    if (ambianceMatch) {
      const idx = parseInt(ambianceMatch[1], 10);
      const entries = ambianceBlocks[idx];
      if (entries.length > 0) {
        if (!seenHeading) {
          scenarioAmbianceTrack = entries;
        } else if (currentTarget) {
          currentTarget.ambianceTrack = entries;
        }
      }
      continue;
    }

    if (hasMetaTags && isMetaOnlyLine(line)) {
      if (!seenHeading) {
        Object.assign(scenarioMeta, lineMeta);
      } else if (currentTarget) {
        Object.assign(currentTarget.metadata, lineMeta);
      }
      continue; // Don't add to body
    }

    // Section break: bare `====` (even count, 2-6) closes a section
    const closeMatch = line.match(/^(={2,6})$/);
    if (closeMatch) {
      flushBody();
      const closeLevel = closeMatch[1].length / 2;
      let lastPopped: WikiSection | null = null;
      while (stack.length > 0 && stack[stack.length - 1].level >= closeLevel) {
        lastPopped = stack.pop()!.section;
      }
      currentTarget = stack.length > 0 ? stack[stack.length - 1].section : lastPopped;
      continue;
    }

    const match = line.match(HEADING_RE);
    if (match) {
      flushBody();
      seenHeading = true;
      const level = match[1].length;
      const title = match[2].trim();
      const section: WikiSection = {
        id: slugify(title),
        title,
        level,
        content: "",
        contentSegments: [""],
        metadata: {},
        children: [],
      };

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(section);
      } else {
        const parent = stack[stack.length - 1].section;
        parent.children.push(section);
        // Push a new segment for content that follows this child
        parent.contentSegments.push("");
      }

      stack.push({ level, section, children: section.children });
      currentTarget = section;
    } else {
      currentBodyLines.push(line);
    }
  }
  flushBody();

  return { metadata: scenarioMeta, ambianceTrack: scenarioAmbianceTrack, sections: root };
}

/**
 * Resolve the effective ambiance track for a section,
 * falling back to the ancestor's track if the section has none.
 */
export function resolveAmbianceTrack(
  section: WikiSection,
  ancestorTrack: AmbianceEntry[] | undefined
): AmbianceEntry[] | undefined {
  return section.ambianceTrack || ancestorTrack || undefined;
}

export function findSection(sections: WikiSection[], id: string): WikiSection | null {
  for (const s of sections) {
    if (s.id === id) return s;
    const found = findSection(s.children, id);
    if (found) return found;
  }
  return null;
}

/**
 * Resolve the effective background image for a section,
 * falling back to the ancestor's background if the section has none.
 */
export function resolveBackgroundImage(
  section: WikiSection,
  ancestorBg: string | null
): string | null {
  return section.metadata.background_image || ancestorBg || null;
}

/**
 * Extract image URLs from MediaWiki wikitext.
 */
export function extractImageUrls(wikitext: string): string[] {
  const urls: string[] = [];
  const fileRe = /\[\[(?:File|Image):([^|\]]+)/gi;
  let match;
  while ((match = fileRe.exec(wikitext)) !== null) {
    const src = match[1].trim();
    if (src.startsWith("http")) {
      urls.push(src);
    }
  }
  const rawUrlRe = /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)/gi;
  while ((match = rawUrlRe.exec(wikitext)) !== null) {
    if (!urls.includes(match[0])) {
      urls.push(match[0]);
    }
  }
  return urls;
}
