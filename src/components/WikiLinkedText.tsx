import { Fragment, useMemo } from "react";
import { buildFeatsMap, getFeatMeta, type Feat } from "@/data/feats";
import { convertInlineMarkup } from "@/lib/parseWikitext";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface WikiLinkedTextProps {
  text: string;
  className?: string;
}

interface TextSegment {
  type: "text" | "link" | "plain";
  text: string;
  html?: string;
  target?: string;
}

function parseSegments(raw: string): TextSegment[] {
  raw = raw.replace(/<!--[\s\S]*?-->/g, "");

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const re = /\[\[([^\]]+)\]\]/g;
  let match;

  while ((match = re.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = raw.slice(lastIndex, match.index);
      segments.push({ type: "text", text: textChunk, html: convertInlineMarkup(textChunk) });
    }

    const inner = match[1];

    if (/^Category:/i.test(inner)) {
      lastIndex = re.lastIndex;
      continue;
    }

    if (/^:Category:/i.test(inner)) {
      const pipeIdx = inner.indexOf("|");
      const label = pipeIdx !== -1 ? inner.slice(pipeIdx + 1).trim() : inner.replace(/^:Category:/i, "").trim();
      segments.push({ type: "plain", text: label });
      lastIndex = re.lastIndex;
      continue;
    }

    const pipeIdx = inner.indexOf("|");
    const target = pipeIdx !== -1 ? inner.slice(0, pipeIdx).trim() : inner.trim();
    const label = pipeIdx !== -1 ? inner.slice(pipeIdx + 1).trim() : inner.trim();
    segments.push({ type: "link", text: label, target });
    lastIndex = re.lastIndex;
  }

  if (lastIndex < raw.length) {
    const textChunk = raw.slice(lastIndex);
    segments.push({ type: "text", text: textChunk, html: convertInlineMarkup(textChunk) });
  }

  return segments;
}

function FeatHoverContent({ featTitle, featsMap }: { featTitle: string; featsMap: Map<string, Feat> }) {
  const feat = featsMap.get(featTitle.toLowerCase());
  if (!feat) {
    return <p className="text-xs text-muted-foreground">Feat not found: {featTitle}</p>;
  }

  const fields = parseFeatFields(feat.content);
  const meta = parseEmbeddedFeatMeta(feat.raw_content || feat.content);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-foreground">{feat.title}</p>
      {meta.description && (
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      )}
      {fields.description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Description</p>
          <p className="text-xs text-muted-foreground/80 whitespace-pre-line">{stripLinks(fields.description)}</p>
        </div>
      )}
      {(meta.prerequisites || fields.prerequisites) && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Prerequisites</p>
          <p className="text-xs text-muted-foreground/80">{stripLinks(meta.prerequisites || fields.prerequisites!)}</p>
        </div>
      )}
      {meta.blocking && meta.blocking.length > 0 && (
        <div>
          <p className="text-xs font-medium text-destructive">Incompatible with</p>
          <p className="text-xs text-destructive/80">{meta.blocking.join(", ")}</p>
        </div>
      )}
      {fields.special && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Special</p>
          <p className="text-xs text-muted-foreground/80 whitespace-pre-line">{stripLinks(fields.special)}</p>
        </div>
      )}
    </div>
  );
}

function stripLinks(text: string): string {
  return text
    .replace(/\[\[Category:[^\]]*\]\]/gi, "")
    .replace(/\[\[:Category:[^|\]]+\|([^\]]+)\]\]/gi, "$1")
    .replace(/\[\[:Category:[^\]]*\]\]/gi, "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

// Build the feats map once (module-level singleton, lazy)
let _featsMap: Map<string, Feat> | null = null;
function getFeatsMap(): Map<string, Feat> {
  if (!_featsMap) _featsMap = buildFeatsMap();
  return _featsMap;
}

export default function WikiLinkedText({ text, className = "" }: WikiLinkedTextProps) {
  const segments = useMemo(() => parseSegments(text), [text]);
  const hasLinks = segments.some((s) => s.type === "link");
  const featsMap = hasLinks ? getFeatsMap() : null;

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i} dangerouslySetInnerHTML={{ __html: seg.html! }} />;
        }
        if (seg.type === "plain") {
          return <Fragment key={i}>{seg.text}</Fragment>;
        }
        if (!featsMap) {
          return (
            <span key={i} className="text-primary underline decoration-dotted underline-offset-2">
              {seg.text}
            </span>
          );
        }
        return (
          <HoverCard key={i} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <span className="text-primary underline decoration-dotted underline-offset-2 cursor-help">
                {seg.text}
              </span>
            </HoverCardTrigger>
            <HoverCardContent className="w-72" side="top">
              <FeatHoverContent featTitle={seg.target!} featsMap={featsMap} />
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </span>
  );
}
