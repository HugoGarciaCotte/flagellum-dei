import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { type SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";
import FeatListItem from "@/components/FeatListItem";
import { sortTitlesEmojiLast } from "@/lib/utils";
import {
  Loader2, Sparkles, Upload, Dices, ChevronRight, SkipForward,
  Search, ArrowLeft, WifiOff,
} from "lucide-react";
import { getAllFeats, getFeatMeta } from "@/data/feats";
import Logo from "@/components/Logo";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { upsertRow, deleteBy } from "@/lib/localStore";
import { triggerPush } from "@/lib/syncManager";
import { useTranslation } from "@/i18n/useTranslation";

interface CharacterCreationWizardProps {
  onCreated: (characterId: string) => void;
  onCancel?: () => void;
  gameId?: string;
}

type Feat = {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
};

const CharacterCreationWizard = ({ onCreated, onCancel, gameId }: CharacterCreationWizardProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const online = useNetworkStatus();
  const { t } = useTranslation();

  // Wizard state
  const [step, setStep] = useState(0);
  const [archetypeFeatId, setArchetypeFeatId] = useState<string | null>(null);
  const [subfeatSelections, setSubfeatSelections] = useState<Map<number, string | null>>(new Map());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFeatId, setExpandedFeatId] = useState<string | null>(null);

  // Progressive save state
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characterFeatId, setCharacterFeatId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Loading states
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingName, setGeneratingName] = useState(false);
  const [generatingPortrait, setGeneratingPortrait] = useState(false);
  const [creating, setCreating] = useState(false);

  const allFeats = useMemo(() => getAllFeats() as Feat[], []);

  const featMap = useMemo(() => {
    const map = new Map<string, Feat>();
    (allFeats ?? []).forEach((f) => map.set(f.id, f));
    return map;
  }, [allFeats]);

  const featByTitle = useMemo(() => {
    const map = new Map<string, Feat>();
    (allFeats ?? []).forEach((f) => map.set(f.title, f));
    return map;
  }, [allFeats]);

  const metaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getFeatMeta>>();
    (allFeats ?? []).forEach((f) => {
      map.set(f.id, getFeatMeta(f));
    });
    return map;
  }, [allFeats]);

  const descriptionMap = useMemo(() => {
    const map = new Map<string, string>();
    metaMap.forEach((meta, id) => {
      if (meta.description) map.set(id, meta.description);
    });
    return map;
  }, [metaMap]);

  const archetypeFeat = archetypeFeatId ? featMap.get(archetypeFeatId) : null;
  const archetypeMeta = archetypeFeatId ? metaMap.get(archetypeFeatId) : null;

  const subfeatSlots = useMemo(() => {
    return archetypeMeta?.subfeats ?? [];
  }, [archetypeMeta]);

  const finalStep = 2 + subfeatSlots.length;

  const resolveSubfeatOptions = (slotInfo: SubfeatSlot) => {
    if (!allFeats) return null;
    if (slotInfo.kind === "fixed" && slotInfo.feat_title) {
      const f = featByTitle.get(slotInfo.feat_title);
      return f ? { type: "fixed" as const, feat: f } : null;
    }
    if (slotInfo.kind === "list" && slotInfo.options) {
      const optSet = new Set(slotInfo.options);
      const feats = allFeats.filter(f => optSet.has(f.title)).sort(sortTitlesEmojiLast);
      return { type: "list" as const, feats };
    }
    if (slotInfo.kind === "type" && slotInfo.filter) {
      const filters = slotInfo.filter.split(",").map(s => s.trim()).filter(Boolean);
      const include = filters.filter(f => !f.startsWith("!"));
      const exclude = filters.filter(f => f.startsWith("!")).map(f => f.slice(1));
      const feats = allFeats.filter(f => {
        const cats = f.categories ?? [];
        if (include.length > 0 && !include.some(c => cats.includes(c))) return false;
        if (exclude.some(c => cats.includes(c))) return false;
        return true;
      }).sort(sortTitlesEmojiLast);
      return { type: "list" as const, feats };
    }
    return null;
  };

  const subfeatOptionsList = useMemo(() => {
    return subfeatSlots.map(slot => resolveSubfeatOptions(slot));
  }, [subfeatSlots, allFeats, featByTitle]);

  const archetypes = useMemo(() => {
    if (!allFeats) return [];
    return allFeats.filter(f => f.categories?.includes("Archetype")).sort(sortTitlesEmojiLast);
  }, [allFeats]);

  // Auto-set fixed subfeats
  useEffect(() => {
    subfeatSlots.forEach((slot, idx) => {
      const options = subfeatOptionsList[idx];
      if (options?.type === "fixed" && !subfeatSelections.has(slot.slot)) {
        setSubfeatSelections(prev => {
          const next = new Map(prev);
          next.set(slot.slot, options.feat.id);
          return next;
        });
      }
    });
  }, [subfeatSlots, subfeatOptionsList]);

  // Generate description when reaching final step
  useEffect(() => {
    if (step === finalStep && !description && !generatingDesc && online) {
      generateDescription();
    }
  }, [step, finalStep, online]);

  // --- Progressive save helpers (local-first) ---

  const saveArchetype = async (featId: string) => {
    if (!user) return;
    setSaving(true);

    if (characterId && characterFeatId) {
      // Update existing
      upsertRow("character_feats", { id: characterFeatId, character_id: characterId, feat_id: featId, level: 1, is_free: false, note: null });
      deleteBy("character_feat_subfeats", { character_feat_id: characterFeatId });
      setSubfeatSelections(new Map());
    } else {
      const tempCharId = crypto.randomUUID();
      const tempCfId = crypto.randomUUID();
      setCharacterId(tempCharId);
      setCharacterFeatId(tempCfId);

      const now = new Date().toISOString();
      upsertRow("characters", { id: tempCharId, user_id: user.id, name: "New Character", description: null, portrait_url: null, created_at: now, updated_at: now });
      upsertRow("character_feats", { id: tempCfId, character_id: tempCharId, feat_id: featId, level: 1, is_free: false, note: null });

      if (gameId) {
        // Find player row and update
        const { getBy } = await import("@/lib/localStore");
        const playerRows = getBy("game_players", { game_id: gameId, user_id: user.id });
        if (playerRows.length > 0) {
          upsertRow("game_players", { ...playerRows[0], character_id: tempCharId });
        }
      }
    }

    triggerPush();
    setSaving(false);
  };

  const saveSubfeat = async (slotNum: number, subfeatId: string | null) => {
    if (!characterFeatId) return;
    setSaving(true);

    // Delete existing at slot
    if (characterId) {
      const { getBy } = await import("@/lib/localStore");
      const existing = getBy("character_feat_subfeats", { character_feat_id: characterFeatId, slot: slotNum });
      for (const row of existing) {
        const { deleteRow } = await import("@/lib/localStore");
        deleteRow("character_feat_subfeats", row.id);
      }
    }

    if (subfeatId) {
      upsertRow("character_feat_subfeats", { id: crypto.randomUUID(), character_feat_id: characterFeatId, slot: slotNum, subfeat_id: subfeatId });
    }

    triggerPush();
    setSaving(false);
  };

  const saveFinalDetails = async () => {
    if (!characterId || !user) return;
    setCreating(true);

    const now = new Date().toISOString();
    upsertRow("characters", {
      id: characterId,
      user_id: user.id,
      name: name || "Blank",
      description: description || null,
      portrait_url: portraitUrl,
      updated_at: now,
    });
    triggerPush();

    onCreated(characterId);
    setCreating(false);
  };

  const getSelectedFeatSummaries = () => {
    const summaries: string[] = [];
    const addFeat = (f: { title: string; description?: string | null }) => {
      summaries.push(f.description ? `${f.title} (${f.description})` : f.title);
    };
    if (archetypeFeat) addFeat(archetypeFeat);
    subfeatSelections.forEach((id) => {
      if (id) {
        const f = featMap.get(id);
        if (f) addFeat(f);
      }
    });
    return summaries;
  };

  const generateDescription = async () => {
    setGeneratingDesc(true);
    try {
      const featSummaries = getSelectedFeatSummaries();
      const { data, error } = await supabase.functions.invoke("generate-character-details", {
        body: {
          type: "description",
          archetype: archetypeFeat?.title ?? "Unknown",
          faith: "None",
          feats: featSummaries,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.result) setDescription(data.result);
    } catch (e: any) {
      console.error("Description generation failed:", e);
    } finally {
      setGeneratingDesc(false);
    }
  };

  const generateName = async () => {
    setGeneratingName(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-character-details", {
        body: {
          type: "name",
          archetype: archetypeFeat?.title ?? "Unknown",
          description: description || "a mysterious figure",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.result) setName(data.result);
    } catch (e: any) {
      toast({ title: t("wizard.toast.nameFailed"), description: e.message, variant: "destructive" });
    } finally {
      setGeneratingName(false);
    }
  };

  const handleSkipBeforeArchetype = async () => {
    if (!user) return;
    setCreating(true);

    const tempCharId = crypto.randomUUID();
    const now = new Date().toISOString();
    upsertRow("characters", { id: tempCharId, user_id: user.id, name: "Blank", description: null, portrait_url: null, created_at: now, updated_at: now });

    if (gameId) {
      const { getBy } = await import("@/lib/localStore");
      const playerRows = getBy("game_players", { game_id: gameId, user_id: user.id });
      if (playerRows.length > 0) {
        upsertRow("game_players", { ...playerRows[0], character_id: tempCharId });
      }
    }

    triggerPush();
    onCreated(tempCharId);
    setCreating(false);
  };

  const handleSkipAfterArchetype = () => {
    if (characterId) {
      onCreated(characterId);
    }
  };

  // Portrait handlers
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!online) {
      const localUrl = URL.createObjectURL(file);
      setPortraitUrl(localUrl);
      toast({ title: t("wizard.toast.portraitSavedLocally") });
      return;
    }

    const targetId = characterId || crypto.randomUUID();
    const filePath = `${user.id}/${targetId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("character-portraits")
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      toast({ title: t("wizard.toast.uploadFailed"), description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("character-portraits")
      .getPublicUrl(filePath);
    setPortraitUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);
    toast({ title: t("wizard.toast.portraitUploaded") });
  };

  const handleGeneratePortrait = async () => {
    setGeneratingPortrait(true);
    try {
      const featSummaries = getSelectedFeatSummaries();
      const { data, error } = await supabase.functions.invoke("generate-portrait-preview", {
        body: { description: description || "A medieval fantasy character", featNames: featSummaries.filter(Boolean) },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.image_data_url) throw new Error("No image returned");

      setPortraitUrl(data.image_data_url);
      toast({ title: t("wizard.toast.portraitGenerated") });
    } catch (e: any) {
      toast({ title: t("wizard.toast.portraitFailed"), description: e.message, variant: "destructive" });
    } finally {
      setGeneratingPortrait(false);
    }
  };

  // Filter feats by search
  const filterBySearch = (feats: Feat[]) => {
    if (!searchTerm.trim()) return feats;
    const lower = searchTerm.toLowerCase();
    return feats.filter(f => f.title.toLowerCase().includes(lower));
  };

  const renderFeatList = (feats: Feat[], onSelect: (id: string) => void) => (
    <div className="space-y-1.5">
      {feats.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No feats found.</p>
      ) : feats.map(f => (
        <FeatListItem
          key={f.id}
          feat={{ ...f, description: descriptionMap.get(f.id) ?? null }}
          expanded={expandedFeatId === f.id}
          onToggleExpand={() => setExpandedFeatId(expandedFeatId === f.id ? null : f.id)}
          onQuickAction={() => onSelect(f.id)}
          quickActionLabel="Select"
        />
      ))}
    </div>
  );

  const renderSearchBar = () => (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        placeholder={t("wizard.search")}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="pl-8 h-8 text-sm"
      />
    </div>
  );

  const renderStepIndicator = () => {
    const totalDots = 1 + subfeatSlots.length + 1;
    return (
      <div className="flex items-center justify-center gap-1.5 mb-4">
        {Array.from({ length: totalDots }, (_, i) => {
          const dotStep = i + 1;
          return (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                dotStep === step ? "w-6 bg-primary" : dotStep < step ? "w-3 bg-primary/50" : "w-3 bg-muted"
              }`}
            />
          );
        })}
      </div>
    );
  };

  const skipButton = characterId ? (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground gap-1"
      onClick={handleSkipAfterArchetype}
      disabled={saving}
    >
      <SkipForward className="h-3.5 w-3.5" /> Skip
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground gap-1"
      onClick={handleSkipBeforeArchetype}
      disabled={creating}
    >
      <SkipForward className="h-3.5 w-3.5" /> Skip
    </Button>
  );

  const goToNextStep = (fromStep: number) => {
    setStep(fromStep + 1);
    setSearchTerm("");
    setExpandedFeatId(null);
  };

  const goToPrevStep = (fromStep: number) => {
    setStep(fromStep - 1);
    setSearchTerm("");
    setExpandedFeatId(null);
  };

  const renderSubfeatStep = (
    stepNum: number,
    slotInfo: SubfeatSlot,
    options: ReturnType<typeof resolveSubfeatOptions>,
  ) => {
    const isFixed = options?.type === "fixed";

    const handleSubfeatSelect = async (id: string | null) => {
      setSubfeatSelections(prev => {
        const next = new Map(prev);
        next.set(slotInfo.slot, id);
        return next;
      });
      await saveSubfeat(slotInfo.slot, id);
      goToNextStep(stepNum);
    };

    const slotIndex = stepNum - 2;
    const stepConfig = [
      {
        title: t("wizard.step.faith.title"),
        subtitleChoice: t("wizard.step.faith.choiceDesc"),
        subtitleFixed: t("wizard.step.faith.fixedDesc"),
      },
      {
        title: t("wizard.step.mainFeat.title"),
        subtitleChoice: t("wizard.step.mainFeat.choiceDesc"),
        subtitleFixed: t("wizard.step.mainFeat.fixedDesc"),
      },
      {
        title: t("wizard.step.subSpecialty.title"),
        subtitleChoice: t("wizard.step.subSpecialty.choiceDesc"),
        subtitleFixed: t("wizard.step.subSpecialty.fixedDesc"),
      },
    ][slotIndex] ?? { title: t("wizard.step.default.title"), subtitleChoice: t("wizard.step.default.choiceDesc"), subtitleFixed: t("wizard.step.default.fixedDesc") };

    return (
      <div className="space-y-4">
        {renderStepIndicator()}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPrevStep(stepNum)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-display text-lg text-foreground">{stepConfig.title}</h3>
          </div>
          {skipButton}
        </div>

        {isFixed && options.type === "fixed" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {stepConfig.subtitleFixed}
            </p>
            <div className="ring-2 ring-primary rounded">
              <FeatListItem
                feat={{ ...options.feat, description: descriptionMap.get(options.feat.id) ?? null }}
                expanded={expandedFeatId === options.feat.id}
                onToggleExpand={() => setExpandedFeatId(expandedFeatId === options.feat.id ? null : options.feat.id)}
              />
            </div>
            <Button onClick={() => handleSubfeatSelect(options.feat.id)} className="w-full font-display gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} {t("wizard.continue")}
            </Button>
          </div>
        ) : options?.type === "list" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {stepConfig.subtitleChoice}
            </p>
            <button
              onClick={() => handleSubfeatSelect(null)}
              className="w-full text-left p-3 rounded border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{slotIndex === 0 ? t("wizard.step.noFaith") : t("wizard.step.none")}</span>
                <span className="text-xs text-muted-foreground">
                  {slotIndex === 0
                    ? t("wizard.step.noFaithDesc")
                    : t("wizard.step.skipSlot")}
                </span>
              </div>
            </button>
            {renderSearchBar()}
            {renderFeatList(filterBySearch(options.feats), (id) => {
              handleSubfeatSelect(id);
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("wizard.step.noChoices")}</p>
            <Button onClick={() => goToNextStep(stepNum)} className="w-full font-display gap-2">
              <ChevronRight className="h-4 w-4" /> {t("wizard.continue")}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="space-y-2">
          <Logo className="text-5xl mx-auto" />
          <h2 className="font-display text-2xl text-foreground">{t("wizard.welcome.title")}</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {t("wizard.welcome.desc")}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => setStep(1)} className="font-display gap-2">
            <ChevronRight className="h-4 w-4" /> {t("wizard.welcome.begin")}
          </Button>
          {skipButton}
        </div>
      </div>
    );
  }

  // Step 1: Archetype pick
  if (step === 1) {
    const handleArchetypeSelect = async (id: string) => {
      setArchetypeFeatId(id);
      await saveArchetype(id);
      setStep(2);
      setSearchTerm("");
      setExpandedFeatId(null);
    };

    return (
      <div className="space-y-4">
        {renderStepIndicator()}
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-foreground">{t("wizard.archetype.title")}</h3>
          {skipButton}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("wizard.archetype.desc")}
        </p>
        {renderSearchBar()}
        {renderFeatList(filterBySearch(archetypes), handleArchetypeSelect)}
      </div>
    );
  }

  // Steps 2..finalStep-1: Dynamic subfeat slots
  const subfeatIndex = step - 2;
  if (subfeatIndex >= 0 && subfeatIndex < subfeatSlots.length) {
    const slotInfo = subfeatSlots[subfeatIndex];
    const options = subfeatOptionsList[subfeatIndex];
    return renderSubfeatStep(step, slotInfo, options);
  }

  // Final step: Summary, Name, Portrait
  if (step === finalStep) {
    const initials = name ? name.slice(0, 2).toUpperCase() : "??";

    const selectedSubfeats = subfeatSlots
      .map(slot => {
        const id = subfeatSelections.get(slot.slot);
        if (!id) return null;
        const feat = featMap.get(id);
        if (!feat) return null;
        const slotIndex = subfeatSlots.indexOf(slot);
        const label = [
          t("wizard.summary.faith"),
          t("wizard.summary.mainFeat"),
          t("wizard.summary.subSpecialty"),
        ][slotIndex] ?? t("wizard.summary.feat");
        return { label, title: feat.title };
      })
      .filter(Boolean) as { label: string; title: string }[];

    return (
      <div className="space-y-5">
        {renderStepIndicator()}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPrevStep(step)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-display text-lg text-foreground">{t("wizard.summary.title")}</h3>
          </div>
          {skipButton}
        </div>

        <div className="space-y-1 text-sm">
          {archetypeFeat && (
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">{t("wizard.summary.archetype")}</span> {archetypeFeat.title}
            </p>
          )}
          {selectedSubfeats.map((s, i) => (
            <p key={i} className="text-muted-foreground">
              <span className="text-foreground font-medium">{s.label}:</span> {s.title}
            </p>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Avatar className="h-24 w-24 border-2 border-primary/30">
            {portraitUrl ? <AvatarImage src={portraitUrl} /> : null}
            <AvatarFallback className="text-xl font-display bg-muted">
              {generatingPortrait ? <Loader2 className="h-6 w-6 animate-spin" /> : initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={generatingPortrait || !online}>
              <Upload className="h-3.5 w-3.5" /> {t("wizard.portrait.upload")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleGeneratePortrait}
              disabled={generatingPortrait || !online || (!description && !archetypeFeatId)}
            >
              {generatingPortrait ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t("wizard.portrait.generate")}
            </Button>
          </div>
          {!online && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> {t("wizard.portrait.offlineNote")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">{t("wizard.description")}</label>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={generateDescription}
              disabled={generatingDesc || !online}
            >
              {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {t("wizard.regenerate")}
            </Button>
          </div>
          {generatingDesc ? (
            <div className="flex items-center gap-2 py-3 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t("wizard.craftingLegend")}</span>
            </div>
          ) : (
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t("wizard.descPlaceholder")}
              rows={2}
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">{t("wizard.name")}</label>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={generateName}
              disabled={generatingName || !online}
            >
              {generatingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Dices className="h-3 w-3" />}
              Random Name
            </Button>
          </div>
          <Input
            placeholder="Character name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <Button
          onClick={saveFinalDetails}
          disabled={creating || !name.trim()}
          className="w-full font-display gap-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Finish Character
        </Button>
      </div>
    );
  }

  return null;
};

export default CharacterCreationWizard;
