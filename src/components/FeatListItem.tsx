import { ReactNode } from "react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import FeatDetailsDisplay from "@/components/FeatDetailsDisplay";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FeatListItemFeat {
  id: string;
  title: string;
  categories: string[];
  description?: string | null;
  content: string | null;
  raw_content?: string | null;
}

interface FeatListItemProps {
  feat: FeatListItemFeat;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Speciality options for this feat (from feats.specialities) */
  specialities?: string[] | null;
  /** Currently chosen speciality value (stored in character_feats.note) */
  specialityValue?: string;
  /** Called when the user picks a speciality */
  onSpecialityChange?: (value: string) => void;
  actions?: ReactNode;
  expandedContent?: ReactNode;
  /** Content always visible below the header (e.g. subfeats) */
  collapsedContent?: ReactNode;
  compact?: boolean;
  /** Extra inline content after title (e.g. validation spinner) */
  titlePrefix?: ReactNode;
  /** Quick action callback (e.g. "Take" in picker) */
  onQuickAction?: () => void;
  /** Label for the quick action button */
  quickActionLabel?: string;
}

const FeatListItem = ({
  feat,
  expanded,
  onToggleExpand,
  specialities,
  specialityValue,
  onSpecialityChange,
  actions,
  expandedContent,
  collapsedContent,
  compact,
  titlePrefix,
  onQuickAction,
  quickActionLabel = "Select",
}: FeatListItemProps) => {
  const hasSpecialities = specialities && specialities.length > 0;
  const hasPicker = !!onQuickAction;

  return (
    <div
      className={`rounded border border-border hover:border-primary/50 transition-colors ${compact ? "p-2" : ""}`}
    >
      <div>
        <div className={`w-full text-left ${compact ? "" : "p-3"}`}>
          <div className="flex items-center gap-2">
            {titlePrefix}
            <span className="text-sm font-medium text-foreground truncate">{feat.title}</span>
            <FeatCategoryBadges categories={feat.categories} />
            <div className="ml-auto flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {hasPicker && (
                <Button size="sm" variant="default" className="h-6 text-xs px-2" onClick={onQuickAction}>
                  {quickActionLabel}
                </Button>
              )}
              {actions}
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={onToggleExpand}>
                {expanded ? "Hide" : "Info"}
              </Button>
            </div>
          </div>
          {feat.description && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{feat.description}</p>
          )}
        </div>
        {/* Speciality dropdown (editable) */}
        {hasSpecialities && onSpecialityChange && (
          <div className={compact ? "mt-1" : "px-3 pb-1"} onClick={(e) => e.stopPropagation()}>
            <Select
              value={specialityValue || "__none__"}
              onValueChange={(val) => onSpecialityChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger className="h-6 text-xs w-32">
                <SelectValue placeholder="Speciality..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Pick —</SelectItem>
                {specialities!.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Speciality read-only display */}
        {hasSpecialities && !onSpecialityChange && specialityValue && (
          <p className={`text-xs text-muted-foreground italic ${compact ? "mt-1" : "px-3 pb-1"}`}>({specialityValue})</p>
        )}
      </div>
      {collapsedContent}
      {expanded && (
        <div className={`space-y-2 ${compact ? "mt-1" : "px-3 pb-3"}`}>
          {feat.content && <FeatDetailsDisplay content={feat.content} rawContent={feat.raw_content} />}
          {expandedContent}
        </div>
      )}
    </div>
  );
};

export default FeatListItem;
