export interface WikiSection {
  id: string;
  title: string;
  level: number;
  content: string;
  children: WikiSection[];
}

const HEADING_RE = /^(={2,6})\s*(.+?)\s*\1$/;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function convertInlineMarkup(text: string): string {
  // Bold: '''text'''
  text = text.replace(/'''(.+?)'''/g, "<strong>$1</strong>");
  // Italic: ''text''
  text = text.replace(/''(.+?)''/g, "<em>$1</em>");
  // Links: [[target|label]] or [[target]]
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  // Horizontal rule
  text = text.replace(/^----$/gm, "<hr>");
  return text;
}

function convertBodyToHtml(lines: string[]): string {
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("* ")) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      result.push(`<li>${convertInlineMarkup(trimmed.slice(2))}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (trimmed === "") {
        result.push("<br>");
      } else {
        result.push(`<p>${convertInlineMarkup(trimmed)}</p>`);
      }
    }
  }
  if (inList) result.push("</ul>");

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
