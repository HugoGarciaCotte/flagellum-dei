import { useState } from "react";
import { ChevronRight, Play } from "lucide-react";
import { WikiSection } from "@/lib/parseWikitext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WikiSectionTreeProps {
  sections: WikiSection[];
  activeSection: string | null;
  onActivateSection: (sectionId: string) => void;
}

const TITLE_SIZES: Record<number, string> = {
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
}: {
  section: WikiSection;
  activeSection: string | null;
  onActivateSection: (id: string) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const isActive = activeSection === section.id;
  const hasChildren = section.children.length > 0;
  const hasContent = section.content.trim().length > 0;

  return (
    <div
      className={cn(
        "transition-colors duration-200 rounded-md",
        isActive && "bg-foreground/10 border-l-4 border-foreground"
      )}
      style={{ marginLeft: depth > 0 ? 16 : 0 }}
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
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Title */}
        <span className={cn("flex-1 text-foreground", TITLE_SIZES[section.level] || "text-sm")}>
          {section.title}
        </span>

        {/* Play button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
            isActive && "opacity-100 text-primary"
          )}
          onClick={() => onActivateSection(section.id)}
        >
          <Play className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content + children */}
      {open && (
        <>
          {hasContent && (
            <div
              className="px-8 pb-2 text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none
                [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_hr]:my-3 [&_p]:mb-1.5"
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
            />
          ))}
        </>
      )}
    </div>
  );
}

export default function WikiSectionTree({ sections, activeSection, onActivateSection }: WikiSectionTreeProps) {
  return (
    <div className="space-y-1">
      {sections.map((section) => (
        <SectionNode
          key={section.id}
          section={section}
          activeSection={activeSection}
          onActivateSection={onActivateSection}
        />
      ))}
    </div>
  );
}
