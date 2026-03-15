import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Swords } from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import { Badge } from "@/components/ui/badge";
import { getAllFeats, getFeatMeta } from "@/data/feats";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

type Feat = {
  id: string;
  title: string;
  content: string | null;
  raw_content: string | null;
  categories: string[];
};

const ManageFeats = () => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const feats = useMemo(() => getAllFeats() as Feat[], []);

  const filteredFeats = useMemo(() => {
    if (!searchTerm) return feats;
    const lower = searchTerm.toLowerCase();
    return feats.filter(f => f.title.toLowerCase().includes(lower));
  }, [feats, searchTerm]);

  const getMeta = (f: Feat) => getFeatMeta(f);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" /> {t("adminLegacy.featsLibrary")}
          <Badge variant="outline" className="text-xs">{feats.length} feats</Badge>
        </h2>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("adminLegacy.featsReadOnly")}
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("adminLegacy.searchFeats")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-1">
        {filteredFeats.map((feat) => {
          const meta = getMeta(feat);
          return (
            <Collapsible
              key={feat.id}
              open={expandedId === feat.id}
              onOpenChange={(open) => setExpandedId(open ? feat.id : null)}
            >
              <CollapsibleTrigger className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
                <span className="font-medium flex-1">{feat.title}</span>
                <FeatCategoryBadges categories={feat.categories ?? []} />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-2">
                {meta.description && (
                  <p className="text-sm text-muted-foreground mb-1">{meta.description}</p>
                )}
                {meta.prerequisites && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Prerequisites:</span> {meta.prerequisites}
                  </p>
                )}
                {meta.blocking && meta.blocking.length > 0 && (
                  <p className="text-sm text-destructive">
                    <span className="font-medium">Incompatible:</span> {meta.blocking.join(", ")}
                  </p>
                )}
                {feat.content && (
                  <details className="mt-1">
                    <summary className="text-sm text-muted-foreground cursor-pointer">Raw content</summary>
                    <pre className="text-sm text-muted-foreground/70 whitespace-pre-wrap mt-1 max-h-48 overflow-y-auto">
                      {feat.content}
                    </pre>
                  </details>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default ManageFeats;
