export interface WikiSection {
  id: string;
  title: string;
  level: number;
  content: string;
  children: WikiSection[];
}

const HEADING_RE = /^(={1,6})\s*(.+?)\s*\1$/;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function convertInlineMarkup(text: string): string {
  // Bold+Italic: '''''text'''''
  text = text.replace(/'''''(.+?)'''''/g, "<strong><em>$1</em></strong>");
  // Bold: '''text'''
  text = text.replace(/'''(.+?)'''/g, "<strong>$1</strong>");
  // Italic: ''text''
  text = text.replace(/''(.+?)''/g, "<em>$1</em>");
  // Internal links: [[target|label]] or [[target]]
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
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
  const listStack: ListType[] = []; // tracks open list tags
  let inPre = false;

  function closeListsTo(targetDepth: number) {
    while (listStack.length > targetDepth) {
      result.push(`</${listStack.pop()}>`);
    }
  }

  for (const line of lines) {
    // Preformatted text: lines starting with a space
    if (line.startsWith(" ") && line.trim().length > 0) {
      closeListsTo(0);
      if (!inPre) { result.push("<pre>"); inPre = true; }
      result.push(convertInlineMarkup(line.slice(1)));
      continue;
    }
    if (inPre) { result.push("</pre>"); inPre = false; }

    const trimmed = line.trim();

    // Bullet / numbered list: lines starting with * or #
    const listMatch = trimmed.match(/^([*#]+)(.*)/);
    if (listMatch) {
      const markers = listMatch[1];
      const content = listMatch[2].trim();
      const depth = markers.length;
      const tag = listTagFor(markers[0]);

      // Close deeper or mismatched lists
      while (listStack.length > depth) {
        result.push(`</${listStack.pop()}>`);
      }
      // Close and reopen if type changed at current depth
      if (listStack.length === depth && listStack[listStack.length - 1] !== tag) {
        result.push(`</${listStack.pop()}>`);
      }
      // Open new lists to reach target depth
      while (listStack.length < depth) {
        result.push(`<${tag}>`);
        listStack.push(tag);
      }
      result.push(`<li>${convertInlineMarkup(content)}</li>`);
      continue;
    }

    // Definition list: ;term or :definition
    const dlMatch = trimmed.match(/^([;:])(.*)/);
    if (dlMatch) {
      const char = dlMatch[1];
      const content = dlMatch[2].trim();
      // Close non-dl lists
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

    // Regular line — close all lists first
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

export function parseWikitext(wikitext: string): WikiSection[] {
  const lines = wikitext.split("\n");
  const root: WikiSection[] = [];
  const stack: { level: number; section: WikiSection; children: WikiSection[] }[] = [];
  let currentBodyLines: string[] = [];
  let currentTarget: WikiSection | null = null;

  function flushBody() {
    if (currentTarget && currentBodyLines.length > 0) {
      currentTarget.content = convertBodyToHtml(currentBodyLines);
    }
    currentBodyLines = [];
  }

  for (const line of lines) {
    if (line.trimStart().startsWith("==>")) continue;
    const match = line.match(HEADING_RE);
    if (match) {
      flushBody();
      const level = match[1].length;
      const title = match[2].trim();
      const section: WikiSection = {
        id: slugify(title),
        title,
        level,
        content: "",
        children: [],
      };

      // Pop stack until we find a parent with a lower level
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

  return root;
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
 * Extract image URLs from MediaWiki wikitext.
 * Handles [[File:url]] and [[Image:url]] syntax, plus raw https image URLs.
 */
export function extractImageUrls(wikitext: string): string[] {
  const urls: string[] = [];
  // MediaWiki file embeds: [[File:something.png|options]] or [[Image:something.jpg]]
  const fileRe = /\[\[(?:File|Image):([^|\]]+)/gi;
  let match;
  while ((match = fileRe.exec(wikitext)) !== null) {
    const src = match[1].trim();
    if (src.startsWith("http")) {
      urls.push(src);
    }
  }
  // Raw image URLs in text
  const rawUrlRe = /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)/gi;
  while ((match = rawUrlRe.exec(wikitext)) !== null) {
    if (!urls.includes(match[0])) {
      urls.push(match[0]);
    }
  }
  return urls;
}
