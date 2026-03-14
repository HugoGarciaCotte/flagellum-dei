import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Play } from "lucide-react";
import { WikiSection, resolveBackgroundImage } from "@/lib/parseWikitext";
import { cn } from "@/lib/utils";
import { buildFeatsMap, getFeatMeta } from "@/data/feats";
import { useTranslation } from "@/i18n/useTranslation";

type TooltipLabels = { description: string; prerequisites: string; special: string };

interface WikiSectionTreeProps {
  sections: WikiSection[];
  activeSection: string | null;
  onActivateSection: (sectionId: string) => void;
  parentBackground?: string | null;
}

const TITLE_SIZES: Record<number, string> = {
  1: "text-2xl font-bold",
  2: "text-xl font-bold",
  3: "text-lg font-semibold",
  4: "text-base font-semibold",
  5: "text-sm font-medium",
  6: "text-xs font-medium",
};

function stripLinks(text: string): string {
  return text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function FeatLinkTooltip({ featName, rect, featsMap, labels }: { featName: string; rect: DOMRect; featsMap: Map<string, any>; labels: { description: string; prerequisites: string; special: string } }) {
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
        {meta.description && <p className="text-xs text-muted-foreground">{meta.description}</p>}
        {meta.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">{labels.description}</p>
            <p className="text-xs text-muted-foreground/80 whitespace-pre-line">{stripLinks(meta.description)}</p>
          </div>
        )}
        {prerequisites && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">{labels.prerequisites}</p>
            <p className="text-xs text-muted-foreground/80">{stripLinks(prerequisites)}</p>
          </div>
        )}
        {meta.special && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">{labels.special}</p>
            <p className="text-xs text-muted-foreground/80 whitespace-pre-line">{stripLinks(meta.special)}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function useFeatsMap() {
  const map = useMemo(() => buildFeatsMap(), []);
  return { data: map };
}

function SectionNode({
  section,
  activeSection,
  onActivateSection,
  depth = 0,
  parentBackground = null,
  featsMap,
  tooltipLabels,
}: {
  section: WikiSection;
  activeSection: string | null;
  onActivateSection: (id: string) => void;
  depth?: number;
  parentBackground?: string | null;
  featsMap: Map<string, any> | undefined;
  tooltipLabels: TooltipLabels;
}) {
  const [open, setOpen] = useState(true);
  const [hoveredFeat, setHoveredFeat] = useState<{ name: string; rect: DOMRect } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isActive = activeSection === section.id;
  const hasChildren = section.children.length > 0;
  const hasContent = section.content.trim().length > 0;

  const effectiveBg = resolveBackgroundImage(section, parentBackground);

  const bgStyle: React.CSSProperties = isActive && effectiveBg
    ? {
        backgroundImage: `linear-gradient(hsl(var(--primary) / 0.85), hsl(var(--primary) / 0.85)), url(${effectiveBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : effectiveBg
    ? {
        backgroundImage: `linear-gradient(hsl(var(--card) / 0.88), hsl(var(--card) / 0.88)), url(${effectiveBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  const hasBgImage = !!effectiveBg;

  // Style and attach hover events to .wiki-feat-link spans
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !featsMap) return;
    const links = el.querySelectorAll<HTMLSpanElement>(".wiki-feat-link");
    links.forEach((link) => {
      link.style.color = "hsl(var(--primary))";
      link.style.textDecoration = "underline";
      link.style.textDecorationStyle = "dotted";
      link.style.textUnderlineOffset = "2px";
      link.style.cursor = "help";
    });
  }, [section.content, featsMap]);

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

  return (
    <div
      className={cn(
        "transition-colors duration-200 rounded-md",
        isActive && "bg-primary text-primary-foreground border-l-4 border-primary",
        hasBgImage && "bg-cover bg-center"
      )}
      style={{ marginLeft: depth > 0 ? 16 : 0, ...bgStyle }}
    >
      {/* Header row */}
      <div className="flex items-center gap-1 py-1.5 px-2 group">
        {/* Chevron toggle */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "p-0.5 rounded hover:bg-muted transition-transform",
            open && "rotate-90",
            !(hasChildren || hasContent) && "invisible"
          )}
        >
          <ChevronRight className={cn("h-4 w-4", isActive ? "text-primary-foreground/70" : "text-muted-foreground")} />
        </button>

        {/* Play button */}
        <button
          onClick={() => onActivateSection(section.id)}
          className={cn(
            "shrink-0 p-1 rounded hover:bg-accent/50 transition-colors",
            isActive ? "text-primary-foreground" : "text-primary"
          )}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
        </button>

        {/* Title */}
        <span className={cn("flex-1", isActive ? "text-primary-foreground" : "text-foreground", TITLE_SIZES[section.level] || "text-sm")}>
          {section.title}
        </span>
      </div>

      {/* Content + children */}
      {open && (
        <>
          {hasContent && (
            <div
              ref={contentRef}
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
              className={cn("px-8 pb-2 text-sm leading-relaxed prose prose-sm max-w-none overflow-x-auto", isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                "[&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_hr]:my-3 [&_p]:mb-1.5 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto")}
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}
          {hoveredFeat && featsMap && tooltipLabels && (
            <FeatLinkTooltip featName={hoveredFeat.name} rect={hoveredFeat.rect} featsMap={featsMap} labels={tooltipLabels} />
          )}
          {section.children.map((child) => (
            <SectionNode
              key={child.id}
              section={child}
              activeSection={activeSection}
              onActivateSection={onActivateSection}
              depth={depth + 1}
              parentBackground={effectiveBg}
              featsMap={featsMap}
              tooltipLabels={tooltipLabels}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default function WikiSectionTree({ sections, activeSection, onActivateSection, parentBackground = null }: WikiSectionTreeProps) {
  const { data: featsMap } = useFeatsMap();
  const { t } = useTranslation();
  const tooltipLabels = useMemo(() => ({
    description: t("wiki.description"),
    prerequisites: t("wiki.prerequisites"),
    special: t("wiki.special"),
  }), [t]);

  return (
    <div className="space-y-1">
      {sections.map((section) => (
        <SectionNode
          key={section.id}
          section={section}
          activeSection={activeSection}
          onActivateSection={onActivateSection}
          parentBackground={parentBackground}
          featsMap={featsMap}
          tooltipLabels={tooltipLabels}
        />
      ))}
    </div>
  );
}
