import { Fragment, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseFeatFields } from "@/lib/parseFeatContent";
import { parseEmbeddedFeatMeta } from "@/lib/parseEmbeddedFeatMeta";
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

function FeatHoverContent({ featTitle, featsMap }: { featTitle: string; featsMap: Map<string, any> }) {
  const feat = featsMap.get(featTitle.toLowerCase());
  if (!feat) {
    return <p className="text-xs text-muted-foreground">Feat not found: {featTitle}</p>;
  }

  const fields = parseFeatFields(feat.content);
  const meta = parseEmbeddedFeatMeta(feat.content);

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

export default function WikiLinkedText({ text, className = "" }: WikiLinkedTextProps) {
  const segments = useMemo(() => parseSegments(text), [text]);
  const hasLinks = segments.some((s) => s.type === "link");

  const { data: featsMap } = useQuery({
    queryKey: ["feats-map-for-links"],
    queryFn: async () => {
      const [featsRes, redirectsRes] = await Promise.all([
        supabase.from("feats").select("title, content"),
        supabase.from("feat_redirects").select("from_title, to_title"),
      ]);
      const map = new Map<string, any>();
      featsRes.data?.forEach((f) => map.set(f.title.toLowerCase(), f));
      redirectsRes.data?.forEach((r) => {
        const target = map.get(r.to_title.toLowerCase());
        if (target) map.set(r.from_title.toLowerCase(), target);
      });
      return map;
    },
    enabled: hasLinks,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

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
