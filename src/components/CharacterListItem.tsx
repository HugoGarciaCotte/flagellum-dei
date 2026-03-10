import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface CharacterListItemProps {
  character: { id: string; name: string; description?: string | null; portrait_url?: string | null };
  actions?: ReactNode;
}

const CharacterListItem = ({ character, actions }: CharacterListItemProps) => {
  const { data: feats } = useQuery({
    queryKey: ["character-feats-summary", character.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_feats")
        .select("id, feat_id, feats!character_feats_feat_id_fkey(title)")
        .eq("character_id", character.id)
        .order("level");
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const cfIds = data.map(cf => cf.id);
      const { data: subfeats } = await supabase
        .from("character_feat_subfeats")
        .select("character_feat_id, subfeat_id, feats!character_feat_subfeats_subfeat_id_fkey(title)")
        .in("character_feat_id", cfIds);

      const subfeatMap = new Map<string, typeof subfeats>();
      for (const sf of subfeats || []) {
        const list = subfeatMap.get(sf.character_feat_id) || [];
        list.push(sf);
        subfeatMap.set(sf.character_feat_id, list);
      }

      return data.map(cf => ({
        ...cf,
        character_feat_subfeats: subfeatMap.get(cf.id) || [],
      }));
    },
  });

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
