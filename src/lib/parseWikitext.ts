export interface WikiSection {
  id: string;
  title: string;
  level: number;
  content: string;
  metadata: Record<string, string>;
  children: WikiSection[];
}

export interface ParsedScenario {
  metadata: Record<string, string>;
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

function convertInlineMarkup(text: string): string {
  // Strip HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");
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

function convertBodyToHtml(lines: string[]): string {
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

export function parseWikitext(wikitext: string): ParsedScenario {
  const lines = wikitext.split("\n");
  const root: WikiSection[] = [];
  const stack: { level: number; section: WikiSection; children: WikiSection[] }[] = [];
  let currentBodyLines: string[] = [];
  let currentTarget: WikiSection | null = null;

  // Scenario-level metadata (before first heading)
  const scenarioMeta: Record<string, string> = {};
  let seenHeading = false;

  // Buffer for meta tags that appear between sections
  let pendingMeta: Record<string, string> = {};

  function flushBody() {
    if (currentTarget && currentBodyLines.length > 0) {
      currentTarget.content = convertBodyToHtml(currentBodyLines);
    }
    currentBodyLines = [];
  }

  for (const line of lines) {
    if (line.trimStart().startsWith("==>")) continue;

    // Check for meta tags
    const lineMeta = extractMetaTags(line);
    const hasMetaTags = Object.keys(lineMeta).length > 0;

    if (hasMetaTags && isMetaOnlyLine(line)) {
      if (!seenHeading) {
        Object.assign(scenarioMeta, lineMeta);
      } else {
        Object.assign(pendingMeta, lineMeta);
      }
      continue; // Don't add to body
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
        metadata: { ...pendingMeta },
        children: [],
      };
      pendingMeta = {};

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(section);
      } else {
        stack[stack.length - 1].section.children.push(section);
      }

      stack.push({ level, section, children: section.children });
      currentTarget = section;
    } else {
      currentBodyLines.push(line);
    }
  }
  flushBody();

  return { metadata: scenarioMeta, sections: root };
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
