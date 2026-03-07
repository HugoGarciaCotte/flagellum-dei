import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import FeatDetailsDisplay from "@/components/FeatDetailsDisplay";

interface FeatListItemFeat {
  id: string;
  title: string;
  categories: string[];
  description: string | null;
  content: string | null;
}

interface FeatListItemProps {
  feat: FeatListItemFeat;
  expanded: boolean;
  onToggleExpand: () => void;
  note?: string | null;
  noteEditor?: ReactNode;
  actions?: ReactNode;
  expandedContent?: ReactNode;
  /** Content always visible below the header (e.g. subfeats) */
  collapsedContent?: ReactNode;
  compact?: boolean;
  /** Extra inline content after title (e.g. validation spinner) */
  titlePrefix?: ReactNode;
}

const FeatListItem = ({
  feat,
  expanded,
  onToggleExpand,
  note,
  noteEditor,
  actions,
  expandedContent,
  collapsedContent,
  compact,
  titlePrefix,
}: FeatListItemProps) => {
  return (
    <div className={`rounded border border-border hover:border-primary/50 transition-colors ${compact ? "p-2" : ""}`}>
      <div className={compact ? "" : ""}>
        <button
          type="button"
          onClick={onToggleExpand}
          className={`w-full text-left ${compact ? "" : "p-3"}`}
        >
          <div className="flex items-center gap-2">
            {titlePrefix}
            <span className="text-sm font-medium text-foreground truncate">{feat.title}</span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {note && !noteEditor && (
              <span className="text-xs text-muted-foreground italic shrink-0">({note})</span>
            )}
            {noteEditor}
            <FeatCategoryBadges categories={feat.categories} />
            {actions && <div className="ml-auto flex gap-1 shrink-0">{actions}</div>}
          </div>
        </button>
        {!expanded && feat.description && (
          <p className={`text-xs text-muted-foreground line-clamp-1 ${compact ? "mt-1" : "px-3 pb-2 mt-0.5"}`}>
            {feat.description}
          </p>
        )}
      </div>
      {collapsedContent}
      {expanded && (
        <div className={`space-y-2 ${compact ? "mt-1" : "px-3 pb-3"}`}>
          {feat.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{feat.description}</p>
          )}
          {feat.content && <FeatDetailsDisplay content={feat.content} />}
          {expandedContent}
        </div>
      )}
    </div>
  );
};

export default FeatListItem;
