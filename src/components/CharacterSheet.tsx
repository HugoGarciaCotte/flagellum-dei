import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Upload, Sparkles, Loader2, WifiOff } from "lucide-react";
import CharacterFeatPicker from "@/components/CharacterFeatPicker";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getFeatById } from "@/data/feats";

import { useLocalRow } from "@/hooks/useLocalData";
import { useLocalRows } from "@/hooks/useLocalData";
import { upsertRow } from "@/lib/localStore";
import { triggerPush } from "@/lib/syncManager";
import { useTranslation } from "@/i18n/useTranslation";

interface CharacterSheetProps {
  characterId: string;
  mode?: "player" | "gm";
  scenarioLevel?: number;
  onDone?: () => void;
}

const CharacterSheet = ({ characterId, mode = "player", scenarioLevel, onDone }: CharacterSheetProps) => {
  const online = useNetworkStatus();
  const effectivelyOffline = !online;
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [dirty, setDirty] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const character = useLocalRow<any>("characters", characterId);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setDesc(character.description || "");
      setDirty(false);
    }
  }, [character]);

  const handleSave = () => {
    if (!character) return;
    upsertRow("characters", { ...character, name, description: desc || null, updated_at: new Date().toISOString() });
    triggerPush();
    setDirty(false);
    toast({ title: t("character.toast.updated") });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !character) return;

    const filePath = `${character.user_id}/${characterId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("character-portraits")
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      toast({ title: t("character.toast.uploadFailed"), description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("character-portraits")
      .getPublicUrl(filePath);
    const portraitUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    upsertRow("characters", { ...character, portrait_url: portraitUrl, updated_at: new Date().toISOString() });
    triggerPush();
    toast({ title: t("character.toast.portraitUploaded") });
  };

  const handleGenerate = async () => {
    if (!character) return;
    setGenerating(true);
    try {
      const characterFeats = useLocalRowsStatic("character_feats", { character_id: characterId });
      const featNames = characterFeats
        .map((cf: any) => getFeatById(cf.feat_id)?.title)
        .filter(Boolean);

      const { data, error } = await supabase.functions.invoke("generate-character-portrait", {
        body: { characterId, featNames },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.portrait_url) {
        upsertRow("characters", { ...character, portrait_url: data.portrait_url, updated_at: new Date().toISOString() });
        triggerPush();
      }
      toast({ title: t("character.toast.portraitGenerated") });
    } catch (e: any) {
      toast({ title: t("character.toast.generationFailed"), description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleNameChange = (val: string) => { setName(val); setDirty(true); };
  const handleDescChange = (val: string) => { setDesc(val); setDirty(true); };

  if (!character) {
    return <div className="text-sm text-muted-foreground py-4 text-center">{t("character.loading")}</div>;
  }

  const initials = character.name.slice(0, 2).toUpperCase();
  const portraitUrl = character.portrait_url;

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
            <Upload className="h-3.5 w-3.5" /> {t("wizard.portrait.upload")}
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
            {t("wizard.portrait.generate")}
          </Button>
        </div>
        {effectivelyOffline && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <WifiOff className="h-3 w-3" /> {t("wizard.portrait.offlineNote")}
          </p>
        )}
      </div>

      <Input
        placeholder={t("wizard.namePlaceholder")}
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
      />
      <Textarea
        placeholder={t("character.descPlaceholder")}
        value={desc}
        onChange={(e) => handleDescChange(e.target.value)}
        rows={3}
      />
      {dirty && (
        <Button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full font-display"
        >
          {t("character.saveChanges")}
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
          {t("character.done")}
        </Button>
      )}
    </div>
  );
};

// Non-hook helper for reading local rows inside async functions
import { getBy } from "@/lib/localStore";
function useLocalRowsStatic(table: any, filter: any) {
  return getBy(table, filter);
}

export default CharacterSheet;
