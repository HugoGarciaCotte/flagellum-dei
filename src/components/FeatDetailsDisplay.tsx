import { parseFeatFields } from "@/lib/parseFeatContent";
import WikiLinkedText from "@/components/WikiLinkedText";

interface FeatDetailsDisplayProps {
  content: string | null | undefined;
  className?: string;
}

const FeatDetailsDisplay = ({ content, className = "" }: FeatDetailsDisplayProps) => {
  const fields = parseFeatFields(content);
  const hasAny = fields.description || fields.special || fields.prerequisites || fields.synonyms;

  if (!hasAny) return null;

  return (
    <div className={`space-y-1.5 border-t border-border pt-1.5 mt-2 ${className}`}>
      {fields.description && (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Description</div>
          <div className="text-xs text-muted-foreground/80 whitespace-pre-line">
            <WikiLinkedText text={fields.description} />
          </div>
        </div>
      )}
      {fields.prerequisites && (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Prerequisites</div>
          <div className="text-xs text-muted-foreground/80">
            <WikiLinkedText text={fields.prerequisites} />
          </div>
        </div>
      )}
      {fields.special && (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Special</div>
          <div className="text-xs text-muted-foreground/80 whitespace-pre-line">
            <WikiLinkedText text={fields.special} />
          </div>
        </div>
      )}
      {fields.synonyms && (
        <div className="text-xs text-muted-foreground/60 italic">Synonyms: {fields.synonyms}</div>
      )}
    </div>
  );
};

export default FeatDetailsDisplay;
