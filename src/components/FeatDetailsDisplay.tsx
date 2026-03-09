import { parseFeatFields } from "@/lib/parseFeatContent";
import { convertBodyToHtml } from "@/lib/parseWikitext";
import { parseEmbeddedFeatMeta } from "@/lib/parseEmbeddedFeatMeta";
import WikiLinkedText from "@/components/WikiLinkedText";
import { useMemo } from "react";

function fieldToHtml(text: string): string {
  return convertBodyToHtml(text.split("\n"));
}

interface FeatDetailsDisplayProps {
  content: string | null | undefined;
  rawContent?: string | null | undefined;
  className?: string;
}

const FeatDetailsDisplay = ({ content, rawContent, className = "" }: FeatDetailsDisplayProps) => {
  const fields = parseFeatFields(rawContent || content);
  const meta = parseEmbeddedFeatMeta(rawContent || content);
  const prerequisites = meta.prerequisites || fields.prerequisites;
  const blocking = meta.blocking;
  const hasFields = fields.description || fields.special || prerequisites || fields.synonyms || (blocking && blocking.length > 0);

  const fullHtml = useMemo(() => {
    if (!content) return null;
    const cleaned = content.replace(/<!--[\s\S]*?-->/g, "").trim();
    if (!cleaned) return null;
    return convertBodyToHtml(cleaned.split("\n"));
  }, [content]);

  if (!hasFields && !fullHtml) return null;

  return (
    <div className={`space-y-1.5 border-t border-border pt-1.5 mt-2 ${className}`}>
      {fields.description && (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Description</div>
          <div
            className="text-xs text-muted-foreground/80 prose prose-xs prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_li]:my-0"
            dangerouslySetInnerHTML={{ __html: fieldToHtml(fields.description) }}
          />
        </div>
      )}
      {prerequisites && (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Prerequisites</div>
          <div className="text-xs text-muted-foreground/80">
            <WikiLinkedText text={prerequisites} />
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
      {fields.synonyms && (
        <div className="text-xs text-muted-foreground/60 italic">Synonyms: {fields.synonyms}</div>
      )}
      {fullHtml && (
        <div
          className="mt-2 text-xs text-muted-foreground/80 prose prose-xs prose-invert max-w-none [&_dt]:font-semibold [&_dt]:text-muted-foreground [&_dd]:ml-3 [&_dd]:text-muted-foreground/80"
          dangerouslySetInnerHTML={{ __html: fullHtml }}
        />
      )}
    </div>
  );
};

export default FeatDetailsDisplay;
