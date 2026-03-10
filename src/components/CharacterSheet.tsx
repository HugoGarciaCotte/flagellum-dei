import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Upload, Sparkles, Loader2, WifiOff } from "lucide-react";
import CharacterFeatPicker from "@/components/CharacterFeatPicker";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import { queueAction, setCacheData, getCacheData } from "@/lib/offlineQueue";

interface CharacterSheetProps {
  characterId: string;
  mode?: "player" | "gm";
  scenarioLevel?: number;
  onDone?: () => void;
}

const CharacterSheet = ({ characterId, mode = "player", scenarioLevel, onDone }: CharacterSheetProps) => {
  const queryClient = useQueryClient();
  const online = useNetworkStatus();
  const { isGuest } = useAuth();
  const effectivelyOffline = !online || isGuest;
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [dirty, setDirty] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: character } = useOfflineQuery(`character-${characterId}`, {
    queryKey: ["character", characterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!characterId,
  });

  useEffect(() => {
    if (character) {
      setName(character.name);
      setDesc(character.description || "");
      setDirty(false);
    }
  }, [character]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (effectivelyOffline) {
        // Queue for later sync
        queueAction({
          table: "characters",
          operation: "update",
          payload: { name, description: desc || null },
          filter: { id: characterId },
        });
        // Optimistically update cache
        const cacheKey = `character-${characterId}`;
        const cached = getCacheData<any>(cacheKey);
        if (cached) {
          setCacheData(cacheKey, { ...cached, name, description: desc || null });
        }
        // Update query cache
        queryClient.setQueryData(["character", characterId], (old: any) =>
          old ? { ...old, name, description: desc || null } : old
        );
        queryClient.setQueryData(["my-characters", character?.user_id], (old: any[]) =>
          old?.map((c: any) => c.id === characterId ? { ...c, name, description: desc || null } : c)
        );
        return;
      }
      const { error } = await supabase
        .from("characters")
        .update({ name, description: desc || null })
        .eq("id", characterId);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      if (!effectivelyOffline) {
        queryClient.invalidateQueries({ queryKey: ["character", characterId] });
        queryClient.invalidateQueries({ queryKey: ["my-characters"] });
        queryClient.invalidateQueries({ queryKey: ["gm-players"] });
        queryClient.invalidateQueries({ queryKey: ["game-characters"] });
      }
      toast({ title: !effectivelyOffline ? "Character updated" : "Saved locally — will sync when online" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !character) return;

    const filePath = `${character.user_id}/${characterId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("character-portraits")
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("character-portraits")
      .getPublicUrl(filePath);
    const portraitUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("characters")
      .update({ portrait_url: portraitUrl } as any)
      .eq("id", characterId);

    if (updateError) {
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["character", characterId] });
    queryClient.invalidateQueries({ queryKey: ["my-characters"] });
    queryClient.invalidateQueries({ queryKey: ["game-characters"] });
    toast({ title: "Portrait uploaded!" });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-character-portrait", {
        body: { characterId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      queryClient.invalidateQueries({ queryKey: ["game-characters"] });
      toast({ title: "Portrait generated!" });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleNameChange = (val: string) => { setName(val); setDirty(true); };
  const handleDescChange = (val: string) => { setDesc(val); setDirty(true); };

  if (!character) {
    return <div className="text-sm text-muted-foreground py-4 text-center">Loading character...</div>;
  }

  const initials = character.name.slice(0, 2).toUpperCase();
  const portraitUrl = (character as any).portrait_url;

  return (
    <div className="space-y-4">
      {/* Portrait */}
      <div className="flex flex-col items-center gap-3">
        <Avatar className="h-28 w-28 border-2 border-primary/30">
          {portraitUrl ? (
            <AvatarImage src={portraitUrl} alt={character.name} />
          ) : null}
          <AvatarFallback className="text-2xl font-display bg-muted">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={effectivelyOffline}
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleGenerate}
            disabled={generating || effectivelyOffline}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate
          </Button>
        </div>
        {effectivelyOffline && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <WifiOff className="h-3 w-3" /> Portrait features available when online
          </p>
        )}
      </div>

      <Input
        placeholder="Character name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
      />
      <Textarea
        placeholder="Description (optional)"
        value={desc}
        onChange={(e) => handleDescChange(e.target.value)}
        rows={3}
      />
      {dirty && (
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          className="w-full font-display"
        >
          Save Changes
        </Button>
      )}

      <CharacterFeatPicker
        characterId={characterId}
        mode={mode}
        scenarioLevel={scenarioLevel}
      />

      {onDone && (
        <Button
          variant="outline"
          className="w-full font-display"
          onClick={onDone}
        >
          Done
        </Button>
      )}
    </div>
  );
};

export default CharacterSheet;
