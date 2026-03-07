import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Play } from "lucide-react";
import { WikiSection, resolveBackgroundImage } from "@/lib/parseWikitext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { parseFeatFields } from "@/lib/parseFeatContent";

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

function SectionNode({
  section,
  activeSection,
  onActivateSection,
  depth = 0,
  parentBackground = null,
}: {
  section: WikiSection;
  activeSection: string | null;
  onActivateSection: (id: string) => void;
  depth?: number;
  parentBackground?: string | null;
}) {
  const [open, setOpen] = useState(true);
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
              className={cn("px-8 pb-2 text-sm leading-relaxed prose prose-sm max-w-none overflow-x-auto", isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                "[&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_hr]:my-3 [&_p]:mb-1.5 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto")}
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}
          {section.children.map((child) => (
            <SectionNode
              key={child.id}
              section={child}
              activeSection={activeSection}
              onActivateSection={onActivateSection}
              depth={depth + 1}
              parentBackground={effectiveBg}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default function WikiSectionTree({ sections, activeSection, onActivateSection, parentBackground = null }: WikiSectionTreeProps) {
  return (
    <div className="space-y-1">
      {sections.map((section) => (
        <SectionNode
          key={section.id}
          section={section}
          activeSection={activeSection}
          onActivateSection={onActivateSection}
          parentBackground={parentBackground}
        />
      ))}
    </div>
  );
}
