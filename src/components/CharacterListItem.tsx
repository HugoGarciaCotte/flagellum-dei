import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface CharacterListItemProps {
  character: { id: string; name: string; description?: string | null };
  actions?: ReactNode;
}

const CharacterListItem = ({ character, actions }: CharacterListItemProps) => {
  const { data: feats } = useQuery({
    queryKey: ["character-feats-summary", character.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_feats")
        .select("id, feat_id, feats(title), character_feat_subfeats(subfeat_id, feats(title))")
        .eq("character_id", character.id)
        .order("level");
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="border-border hover:border-primary/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="font-display text-lg">{character.name}</CardTitle>
          {actions && <div className="flex gap-1 shrink-0">{actions}</div>}
        </div>
        {character.description && <CardDescription>{character.description}</CardDescription>}
      </CardHeader>
      {feats && feats.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
            {feats.map((cf) => (
              <li key={cf.id}>
                {(cf.feats as any)?.title || "Unknown feat"}
                {cf.character_feat_subfeats && (cf.character_feat_subfeats as any[]).length > 0 && (
                  <ul className="list-[circle] list-inside ml-4 mt-0.5 space-y-0.5">
                    {(cf.character_feat_subfeats as any[]).map((sf: any) => (
                      <li key={sf.subfeat_id}>{sf.feats?.title || "Unknown"}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
};

export default CharacterListItem;
