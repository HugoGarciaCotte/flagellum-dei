import { ReactNode, useMemo } from "react";
import { useLocalRows } from "@/hooks/useLocalData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getFeatById } from "@/data/feats";

interface CharacterListItemProps {
  character: { id: string; name: string; description?: string | null; portrait_url?: string | null };
  actions?: ReactNode;
}

const CharacterListItem = ({ character, actions }: CharacterListItemProps) => {
  const allFeats = useLocalRows("character_feats", { character_id: character.id });
  const allSubfeats = useLocalRows("character_feat_subfeats");

  const feats = useMemo(() => {
    const cfIds = new Set(allFeats.map((cf: any) => cf.id));
    const sorted = [...allFeats].sort((a: any, b: any) => (a.level ?? 0) - (b.level ?? 0));
    return sorted.map((cf: any) => ({
      ...cf,
      character_feat_subfeats: allSubfeats.filter((sf: any) => sf.character_feat_id === cf.id),
    }));
  }, [allFeats, allSubfeats]);

  const initials = character.name.slice(0, 2).toUpperCase();

  return (
    <Card className="border-border hover:border-primary/40 transition-colors gold-glow-box">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-primary/20">
              {character.portrait_url ? (
                <AvatarImage src={character.portrait_url} alt={character.name} />
              ) : null}
              <AvatarFallback className="text-xs font-display bg-muted">{initials}</AvatarFallback>
            </Avatar>
            <CardTitle className="font-display text-lg">{character.name}</CardTitle>
          </div>
          {actions && <div className="flex gap-1 shrink-0">{actions}</div>}
        </div>
        {character.description && (
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{character.description}</p>
        )}
      </CardHeader>
      {feats && feats.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
            {feats.map((cf: any) => {
              const featTitle = getFeatById(cf.feat_id)?.title || "Unknown feat";
              return (
                <li key={cf.id}>
                  {featTitle}
                  {cf.character_feat_subfeats && cf.character_feat_subfeats.length > 0 && (
                    <ul className="list-[circle] list-inside ml-4 mt-0.5 space-y-0.5">
                      {cf.character_feat_subfeats.map((sf: any) => {
                        const sfTitle = getFeatById(sf.subfeat_id)?.title || "Unknown";
                        return <li key={sf.subfeat_id}>{sfTitle}</li>;
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  );
};

export default CharacterListItem;
