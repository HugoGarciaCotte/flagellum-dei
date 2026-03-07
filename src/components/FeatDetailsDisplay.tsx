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
          <p className="text-xs font-medium text-muted-foreground">Description</p>
          <p className="text-xs text-muted-foreground/80 whitespace-pre-line">
            <WikiLinkedText text={fields.description} />
          </p>
        </div>
      )}
      {fields.prerequisites && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Prerequisites</p>
          <p className="text-xs text-muted-foreground/80">
            <WikiLinkedText text={fields.prerequisites} />
          </p>
        </div>
      )}
      {fields.special && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Special</p>
          <p className="text-xs text-muted-foreground/80 whitespace-pre-line">
            <WikiLinkedText text={fields.special} />
          </p>
        </div>
      )}
      {fields.synonyms && (
        <p className="text-xs text-muted-foreground/60 italic">Synonyms: {fields.synonyms}</p>
      )}
    </div>
  );
};

export default FeatDetailsDisplay;
