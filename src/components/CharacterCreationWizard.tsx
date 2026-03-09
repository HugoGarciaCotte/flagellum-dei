import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { parseEmbeddedFeatMeta, SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";
import FeatListItem from "@/components/FeatListItem";
import { sortTitlesEmojiLast } from "@/lib/utils";
import {
  Loader2, Sparkles, Upload, Dices, ChevronRight, SkipForward,
  Shield, Search, ArrowLeft,
} from "lucide-react";
import { getCachedFeats } from "@/lib/offlineStorage";

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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch all feats
  const { data: allFeats } = useQuery({
    queryKey: ["all-feats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feats")
        .select("id, title, categories, content, raw_content")
        .order("title");
      if (error) throw error;
      return data as Feat[];
    },
    placeholderData: () => getCachedFeats() as Feat[] | undefined ?? undefined,
  });

  // Maps
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
    const map = new Map<string, ReturnType<typeof parseEmbeddedFeatMeta>>();
    (allFeats ?? []).forEach((f) => {
      map.set(f.id, parseEmbeddedFeatMeta(f.raw_content || f.content));
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

  // Derived state
  const archetypeFeat = archetypeFeatId ? featMap.get(archetypeFeatId) : null;
  const archetypeMeta = archetypeFeatId ? metaMap.get(archetypeFeatId) : null;

  // Dynamic subfeat slots from archetype metadata (already sorted by slot number)
  const subfeatSlots = useMemo(() => {
    return archetypeMeta?.subfeats ?? [];
  }, [archetypeMeta]);

  // Total steps: 0=welcome, 1=archetype, 2..1+N=subfeat slots, finalStep=name/desc/portrait
  const finalStep = 2 + subfeatSlots.length;

  // Helper to resolve subfeat options from a slot definition
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

  // Resolved options for each subfeat slot
  const subfeatOptionsList = useMemo(() => {
    return subfeatSlots.map(slot => resolveSubfeatOptions(slot));
  }, [subfeatSlots, allFeats, featByTitle]);

  // Archetypes for step 1
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
    if (step === finalStep && !description && !generatingDesc) {
      generateDescription();
    }
  }, [step, finalStep]);

  // --- Progressive save helpers ---

  /** Step 1: Create character + archetype feat in DB */
  const saveArchetype = async (featId: string) => {
    if (!user) return;
    setSaving(true);
    try {
      if (characterId && characterFeatId) {
        const { error: cfErr } = await supabase
          .from("character_feats")
          .update({ feat_id: featId })
          .eq("id", characterFeatId);
        if (cfErr) throw cfErr;

        // Delete all existing subfeats since archetype changed
        await supabase
          .from("character_feat_subfeats")
          .delete()
          .eq("character_feat_id", characterFeatId);

        // Reset subfeat selections
        setSubfeatSelections(new Map());
      } else {
        const { data: charData, error: charError } = await supabase
          .from("characters")
          .insert({ user_id: user.id, name: "New Character" } as any)
          .select()
          .single();
        if (charError) throw charError;

        const newCharId = charData.id;
        setCharacterId(newCharId);

        const { data: cfData, error: cfError } = await supabase
          .from("character_feats")
          .insert({ character_id: newCharId, feat_id: featId, level: 1 })
          .select()
          .single();
        if (cfError) throw cfError;
        setCharacterFeatId(cfData.id);

        if (gameId) {
          await supabase
            .from("game_players")
            .update({ character_id: newCharId })
            .eq("game_id", gameId)
            .eq("user_id", user.id);
        }

        queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      }
    } catch (e: any) {
      toast({ title: "Error saving archetype", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /** Save a subfeat selection for a given slot */
  const saveSubfeat = async (slotNum: number, subfeatId: string | null) => {
    if (!characterFeatId) return;
    setSaving(true);
    try {
      await supabase
        .from("character_feat_subfeats")
        .delete()
        .eq("character_feat_id", characterFeatId)
        .eq("slot", slotNum);

      if (subfeatId) {
        const { error } = await supabase
          .from("character_feat_subfeats")
          .insert({ character_feat_id: characterFeatId, slot: slotNum, subfeat_id: subfeatId });
        if (error) throw error;
      }
    } catch (e: any) {
      toast({ title: "Error saving selection", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /** Final step: update character name/description/portrait */
  const saveFinalDetails = async () => {
    if (!characterId || !user) return;
    setCreating(true);
    try {
      const { error } = await supabase
        .from("characters")
        .update({
          name: name || "Blank",
          description: description || null,
          portrait_url: portraitUrl,
        })
        .eq("id", characterId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      onCreated(characterId);
    } catch (e: any) {
      toast({ title: "Error saving character", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // --- End progressive save helpers ---

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
      toast({ title: "Name generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingName(false);
    }
  };

  const handleSkipBeforeArchetype = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data: charData, error: charError } = await supabase
        .from("characters")
        .insert({ user_id: user.id, name: "Blank" } as any)
        .select()
        .single();
      if (charError) throw charError;

      if (gameId) {
        await supabase
          .from("game_players")
          .update({ character_id: charData.id })
          .eq("game_id", gameId)
          .eq("user_id", user.id);
      }

      queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      onCreated(charData.id);
    } catch (e: any) {
      toast({ title: "Error creating character", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
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

    const targetId = characterId || crypto.randomUUID();
    const filePath = `${user.id}/${targetId}.png`;
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
    setPortraitUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);
    toast({ title: "Portrait uploaded!" });
  };

  const handleGeneratePortrait = async () => {
    setGeneratingPortrait(true);
    try {
      const featNames = getSelectedFeatNames();
      const { data, error } = await supabase.functions.invoke("generate-portrait-preview", {
        body: { description: description || "A medieval fantasy character", featNames: featNames.filter(Boolean) },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.image_data_url) throw new Error("No image returned");

      setPortraitUrl(data.image_data_url);
      toast({ title: "Portrait generated!" });
    } catch (e: any) {
      toast({ title: "Portrait generation failed", description: e.message, variant: "destructive" });
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
    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
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
        placeholder="Search..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="pl-8 h-8 text-sm"
      />
    </div>
  );

  // Dynamic step indicator
  const renderStepIndicator = () => {
    // Steps: 1 (archetype) + subfeat slots + 1 (final)
    const totalDots = 1 + subfeatSlots.length + 1;
    return (
      <div className="flex items-center justify-center gap-1.5 mb-4">
        {Array.from({ length: totalDots }, (_, i) => {
          const dotStep = i + 1; // steps start at 1
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

  // Skip button changes depending on whether character already exists
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

  // Navigate helpers
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

  // Generic subfeat step renderer
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
        title: "Choose Your Faith",
        subtitleChoice: "Faith is a major roleplay choice — but it can save your life once. Choose wisely:",
        subtitleFixed: "Your archetype grants you this faith by default:",
      },
      {
        title: "Archetype Ability",
        subtitleChoice: "This is the main ability granted by your archetype:",
        subtitleFixed: "Your archetype grants you this ability by default:",
      },
      {
        title: "Sub-Specialty",
        subtitleChoice: "Pick a sub-specialty to further define your character:",
        subtitleFixed: "Your archetype grants you this sub-specialty by default:",
      },
    ][slotIndex] ?? { title: "Choose an Ability", subtitleChoice: "Choose one:", subtitleFixed: "Granted by default:" };

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
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} Continue
            </Button>
          </div>
        ) : options?.type === "list" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {stepConfig.subtitleChoice}
            </p>
            {/* Always offer a "None" / skip option */}
            <button
              onClick={() => handleSubfeatSelect(null)}
              className="w-full text-left p-3 rounded border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">None</span>
                <span className="text-xs text-muted-foreground">— Skip this slot</span>
              </div>
            </button>
            {renderSearchBar()}
            {renderFeatList(filterBySearch(options.feats), (id) => {
              handleSubfeatSelect(id);
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">No special choices for your archetype.</p>
            <Button onClick={() => goToNextStep(stepNum)} className="w-full font-display gap-2">
              <ChevronRight className="h-4 w-4" /> Continue
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
          <Shield className="h-12 w-12 mx-auto text-primary" />
          <h2 className="font-display text-2xl text-foreground">Create Your Character</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Every hero begins with a calling. Let's forge yours step by step — choose your path, your beliefs, and your skills.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => setStep(1)} className="font-display gap-2">
            <ChevronRight className="h-4 w-4" /> Begin
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
          <h3 className="font-display text-lg text-foreground">Choose Your Archetype</h3>
          {skipButton}
        </div>
        <p className="text-sm text-muted-foreground">
          Your archetype defines who you are — your core abilities and role in the world.
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

    // Auto-skip fixed subfeats that are already set
    if (options?.type === "fixed" && subfeatSelections.get(slotInfo.slot)) {
      // Still render so user sees the granted ability, but they can just click Continue
    }

    return renderSubfeatStep(step, slotInfo, options);
  }

  // Final step: Summary, Name, Portrait
  if (step === finalStep) {
    const initials = name ? name.slice(0, 2).toUpperCase() : "??";

    // Build summary of selections
    const selectedSubfeats = subfeatSlots
      .map(slot => {
        const id = subfeatSelections.get(slot.slot);
        if (!id) return null;
        const feat = featMap.get(id);
        if (!feat) return null;
        // Derive label from slot filter
        let label = "Specialty";
        if (slot.kind === "type" && slot.filter) {
          const filters = slot.filter.split(",").map(s => s.trim()).filter(s => !s.startsWith("!"));
          if (filters.length > 0) label = filters[0];
        } else if (slot.kind === "fixed") {
          label = "Granted";
        }
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
            <h3 className="font-display text-lg text-foreground">Your Character</h3>
          </div>
          {skipButton}
        </div>

        {/* Summary of choices */}
        <div className="space-y-1 text-sm">
          {archetypeFeat && (
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Archetype:</span> {archetypeFeat.title}
            </p>
          )}
          {selectedSubfeats.map((s, i) => (
            <p key={i} className="text-muted-foreground">
              <span className="text-foreground font-medium">{s.label}:</span> {s.title}
            </p>
          ))}
        </div>

        {/* Portrait */}
        <div className="flex flex-col items-center gap-3">
          <Avatar className="h-24 w-24 border-2 border-primary/30">
            {portraitUrl ? <AvatarImage src={portraitUrl} /> : null}
            <AvatarFallback className="text-xl font-display bg-muted">
              {generatingPortrait ? <Loader2 className="h-6 w-6 animate-spin" /> : initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={generatingPortrait}>
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleGeneratePortrait}
              disabled={generatingPortrait || (!description && !archetypeFeatId)}
            >
              {generatingPortrait ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/70 italic text-center max-w-xs">
            Portrait is generated from your description — include details like gender, age, appearance…
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={generateDescription}
              disabled={generatingDesc}
            >
              {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Regenerate
            </Button>
          </div>
          {generatingDesc ? (
            <div className="flex items-center gap-2 py-3 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Crafting your legend...</span>
            </div>
          ) : (
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="An epic description of your character..."
              rows={2}
            />
          )}
        </div>

        {/* Name */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={generateName}
              disabled={generatingName}
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

        {/* Create button */}
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
