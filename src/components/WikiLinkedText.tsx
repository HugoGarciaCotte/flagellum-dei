import { Fragment, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseFeatFields } from "@/lib/parseFeatContent";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const WIKI_LINK_RE = /\[\[([^|\]]+?)(?:\|([^\]]+?))?\]\]/g;

interface WikiLinkedTextProps {
  text: string;
  className?: string;
}

interface TextSegment {
  type: "text" | "link";
  text: string;
  target?: string; // feat name to look up
}

function parseSegments(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(WIKI_LINK_RE.source, "g");
  let match;
  while ((match = re.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: raw.slice(lastIndex, match.index) });
    }
    const target = match[1].trim();
    const label = match[2]?.trim() || target;
    segments.push({ type: "link", text: label, target });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < raw.length) {
    segments.push({ type: "text", text: raw.slice(lastIndex) });
  }
  return segments;
}

function FeatHoverContent({ featTitle, featsMap }: { featTitle: string; featsMap: Map<string, any> }) {
  const feat = featsMap.get(featTitle.toLowerCase());
  if (!feat) {
    return <p className="text-xs text-muted-foreground">Feat not found: {featTitle}</p>;
  }

  const fields = parseFeatFields(feat.content);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-foreground">{feat.title}</p>
      {feat.description && (
        <p className="text-xs text-muted-foreground">{feat.description}</p>
      )}
      {fields.description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Description</p>
          <p className="text-xs text-muted-foreground/80 whitespace-pre-line">{stripLinks(fields.description)}</p>
        </div>
      )}
      {fields.prerequisites && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Prerequisites</p>
          <p className="text-xs text-muted-foreground/80">{stripLinks(fields.prerequisites)}</p>
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

/** Strip wiki links for hover card content to avoid nested parsing */
function stripLinks(text: string): string {
  return text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
}

export default function WikiLinkedText({ text, className = "" }: WikiLinkedTextProps) {
  const cleanText = useMemo(() => text.replace(/<!--[\s\S]*?-->/g, ""), [text]);
  const segments = useMemo(() => parseSegments(cleanText), [cleanText]);
  const hasLinks = segments.some((s) => s.type === "link");

  const { data: featsMap } = useQuery({
    queryKey: ["feats-map-for-links"],
    queryFn: async () => {
      const { data } = await supabase.from("feats").select("title, description, content");
      const map = new Map<string, any>();
      data?.forEach((f) => map.set(f.title.toLowerCase(), f));
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
