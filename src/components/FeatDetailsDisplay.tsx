import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { buildFeatsMap, getFeatMeta, type Feat } from "@/data/feats";
import { convertBodyToHtml } from "@/lib/parseWikitext";
import WikiLinkedText from "@/components/WikiLinkedText";

function stripLinks(text: string): string {
  return text
    .replace(/\[\[Category:[^\]]*\]\]/gi, "")
    .replace(/\[\[:Category:[^|\]]+\|([^\]]+)\]\]/gi, "$1")
    .replace(/\[\[:Category:[^\]]*\]\]/gi, "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

// Module-level singleton
let _featsMap: Map<string, Feat> | null = null;
function getFeatsMap(): Map<string, Feat> {
  if (!_featsMap) _featsMap = buildFeatsMap();
  return _featsMap;
}

function FeatLinkTooltip({ featName, rect }: { featName: string; rect: DOMRect }) {
  const featsMap = getFeatsMap();
  const feat = featsMap.get(featName.toLowerCase());
  if (!feat) return null;
  const meta = getFeatMeta(feat);
  const prerequisites = meta.prerequisites;

  return createPortal(
    <div
      className="fixed z-[100] w-72 rounded-md border bg-popover p-3 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ top: rect.top - 8, left: rect.left + rect.width / 2, transform: "translate(-50%, -100%)" }}
    >
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">{feat.title}</p>
        {fields.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Description</p>
            <p className="text-xs text-muted-foreground/80 whitespace-pre-line">{stripLinks(fields.description)}</p>
          </div>
        )}
        {prerequisites && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Prerequisites</p>
            <p className="text-xs text-muted-foreground/80">{stripLinks(prerequisites)}</p>
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
    </div>,
    document.body
  );
}

interface FeatDetailsDisplayProps {
  content: string | null | undefined;
  rawContent?: string | null | undefined;
  className?: string;
}

const FeatDetailsDisplay = ({ content, rawContent, className = "" }: FeatDetailsDisplayProps) => {
  const meta = parseEmbeddedFeatMeta(rawContent || content);
  const contentFields = parseFeatFields(rawContent || content);
  const prerequisites = meta.prerequisites || contentFields.prerequisites;
  const blocking = meta.blocking;

  const contentRef = useRef<HTMLDivElement>(null);
  const [hoveredFeat, setHoveredFeat] = useState<{ name: string; rect: DOMRect } | null>(null);

  const fullHtml = useMemo(() => {
    if (!content) return null;
    const cleaned = content.replace(/<!--[\s\S]*?-->/g, "").trim();
    if (!cleaned) return null;
    return convertBodyToHtml(cleaned.split("\n"));
  }, [content]);

  const featsMap = getFeatsMap();

  // Style wiki-feat-link spans
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const links = el.querySelectorAll<HTMLSpanElement>(".wiki-feat-link");
    links.forEach((link) => {
      link.style.color = "hsl(var(--primary))";
      link.style.textDecoration = "underline";
      link.style.textDecorationStyle = "dotted";
      link.style.textUnderlineOffset = "2px";
      link.style.cursor = "help";
    });
  }, [fullHtml]);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest(".wiki-feat-link") as HTMLElement | null;
    if (target) {
      const feat = target.getAttribute("data-feat");
      if (feat) setHoveredFeat({ name: feat, rect: target.getBoundingClientRect() });
    }
  }, []);

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest(".wiki-feat-link");
    if (target) setHoveredFeat(null);
  }, []);

  const hasContent = fullHtml || prerequisites || (blocking && blocking.length > 0);
  if (!hasContent) return null;

  return (
    <div className={`space-y-1.5 border-t border-border pt-1.5 mt-2 ${className}`}>
      {prerequisites && (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Prerequisites</div>
          <div className="text-xs text-muted-foreground/80">
            <WikiLinkedText text={prerequisites} />
          </div>
        </div>
      )}
      {blocking && blocking.length > 0 && (
        <div>
          <div className="text-xs font-medium text-destructive">Incompatible with</div>
          <div className="text-xs text-destructive/80">
            {blocking.map((b, i) => (
              <span key={b}>
                {i > 0 && ", "}
                <WikiLinkedText text={`[[${b}]]`} />
              </span>
            ))}
          </div>
        </div>
      )}
      {fullHtml && (
        <div
          ref={contentRef}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          className="text-xs text-muted-foreground/80 prose prose-xs prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_li]:my-0 [&_dt]:font-semibold [&_dt]:text-muted-foreground [&_dd]:ml-3 [&_dd]:text-muted-foreground/80"
          dangerouslySetInnerHTML={{ __html: fullHtml }}
        />
      )}
      {hoveredFeat && featsMap && (
        <FeatLinkTooltip featName={hoveredFeat.name} rect={hoveredFeat.rect} />
      )}
    </div>
  );
};

export default FeatDetailsDisplay;
