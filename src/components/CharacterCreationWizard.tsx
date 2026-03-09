import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { parseEmbeddedFeatMeta } from "@/lib/parseEmbeddedFeatMeta";
import FeatListItem from "@/components/FeatListItem";
import { sortTitlesEmojiLast } from "@/lib/utils";
import {
  Loader2, Sparkles, Upload, Dices, ChevronRight, SkipForward,
  Shield, Cross, Skull, Search, ArrowLeft,
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
  const [faithFeatId, setFaithFeatId] = useState<string | null>(null);
  const [faithSlot, setFaithSlot] = useState<number | null>(null);
  const [subfeat2Id, setSubfeat2Id] = useState<string | null>(null);
  const [subfeat2Slot, setSubfeat2Slot] = useState<number | null>(null);
  const [subfeat3Id, setSubfeat3Id] = useState<string | null>(null);
  const [subfeat3Slot, setSubfeat3Slot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFeatId, setExpandedFeatId] = useState<string | null>(null);

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

  // Faith detection: look for subfeat slot with filter containing "Faith"
  const faithInfo = useMemo(() => {
    if (!archetypeMeta?.subfeats) return null;
    for (const slot of archetypeMeta.subfeats) {
      if (slot.kind === "type" && slot.filter) {
        const filters = slot.filter.split(",").map(s => s.trim());
        const includesF = filters.some(f => f === "Faith" || f === "Faith Feat");
        if (includesF) {
          const allowsDark = !filters.some(f => f === "!Dark Feat" || f === "!Dark Faith");
          return { slot: slot.slot, allowsFaith: true, allowsDarkFaith: allowsDark };
        }
      }
      if (slot.kind === "list" && slot.options) {
        const hasFaith = slot.options.some(o => {
          const f = featByTitle.get(o);
          return f?.categories?.includes("Faith") || f?.categories?.includes("Faith Feat");
        });
        if (hasFaith) {
          return { slot: slot.slot, allowsFaith: true, allowsDarkFaith: false };
        }
      }
    }
    return null;
  }, [archetypeMeta, featByTitle]);

  // Subfeat slot 2 detection: first non-faith slot
  const subfeat2Info = useMemo(() => {
    if (!archetypeMeta?.subfeats) return null;
    const faithSlotNum = faithInfo?.slot ?? -1;
    for (const slot of archetypeMeta.subfeats) {
      if (slot.slot === faithSlotNum) continue;
      return slot;
    }
    return null;
  }, [archetypeMeta, faithInfo]);

  // Subfeat slot 3 detection: remaining slot after faith and subfeat2
  const subfeat3Info = useMemo(() => {
    if (!archetypeMeta?.subfeats) return null;
    const faithSlotNum = faithInfo?.slot ?? -1;
    const subfeat2SlotNum = subfeat2Info?.slot ?? -1;
    for (const slot of archetypeMeta.subfeats) {
      if (slot.slot === faithSlotNum) continue;
      if (slot.slot === subfeat2SlotNum) continue;
      return slot;
    }
    return null;
  }, [archetypeMeta, faithInfo, subfeat2Info]);

  // Step 2: faith feats list
  const faithFeats = useMemo(() => {
    if (!allFeats || !faithInfo) return [];
    return allFeats.filter(f => {
      const cats = f.categories ?? [];
      return cats.includes("Faith") || cats.includes("Faith Feat");
    }).sort(sortTitlesEmojiLast);
  }, [allFeats, faithInfo]);

  const darkFaithFeats = useMemo(() => {
    if (!allFeats || !faithInfo?.allowsDarkFaith) return [];
    return allFeats.filter(f => {
      const cats = f.categories ?? [];
      return cats.includes("Dark Feat") || cats.includes("Dark Faith");
    }).sort(sortTitlesEmojiLast);
  }, [allFeats, faithInfo]);

  // Helper to resolve subfeat options from a slot definition
  const resolveSubfeatOptions = (slotInfo: NonNullable<typeof subfeat2Info>) => {
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

  // Step 3: subfeat 2 options
  const subfeat2Options = useMemo(() => {
    if (!subfeat2Info) return null;
    return resolveSubfeatOptions(subfeat2Info);
  }, [subfeat2Info, allFeats, featByTitle]);

  // Step 4: subfeat 3 options
  const subfeat3Options = useMemo(() => {
    if (!subfeat3Info) return null;
    return resolveSubfeatOptions(subfeat3Info);
  }, [subfeat3Info, allFeats, featByTitle]);

  // Archetypes for step 1
  const archetypes = useMemo(() => {
    if (!allFeats) return [];
    return allFeats.filter(f => f.categories?.includes("Archetype")).sort(sortTitlesEmojiLast);
  }, [allFeats]);

  // Should skip steps?
  const shouldSkipFaith = !faithInfo;
  const shouldSkipSubfeat2 = !subfeat2Info;
  const shouldSkipSubfeat3 = !subfeat3Info;

  // Navigate to next meaningful step
  const goToNextStep = (fromStep: number) => {
    setStep(fromStep + 1);
    setSearchTerm("");
    setExpandedFeatId(null);
  };

  const goToPrevStep = (fromStep: number) => {
    let prev = fromStep - 1;
    if (prev === 4 && shouldSkipSubfeat3) prev = 3;
    if (prev === 3 && shouldSkipSubfeat2) prev = 2;
    if (prev === 2 && shouldSkipFaith) prev = 1;
    setStep(prev);
    setSearchTerm("");
    setExpandedFeatId(null);
  };

  // Reactive step skipping — runs after derived state updates
  useEffect(() => {
    if (step === 2 && shouldSkipFaith) setStep(3);
    else if (step === 3 && shouldSkipSubfeat2) setStep(4);
    else if (step === 4 && shouldSkipSubfeat3) setStep(5);
  }, [step, shouldSkipFaith, shouldSkipSubfeat2, shouldSkipSubfeat3]);

  // Auto-set fixed subfeat2
  useEffect(() => {
    if (subfeat2Options?.type === "fixed") {
      setSubfeat2Id(subfeat2Options.feat.id);
      setSubfeat2Slot(subfeat2Info!.slot);
    }
  }, [subfeat2Options, subfeat2Info]);

  // Auto-set fixed subfeat3
  useEffect(() => {
    if (subfeat3Options?.type === "fixed") {
      setSubfeat3Id(subfeat3Options.feat.id);
      setSubfeat3Slot(subfeat3Info!.slot);
    }
  }, [subfeat3Options, subfeat3Info]);

  // Generate description when reaching step 5
  useEffect(() => {
    if (step === 5 && !description && !generatingDesc) {
      generateDescription();
    }
  }, [step]);

  const generateDescription = async () => {
    setGeneratingDesc(true);
    try {
      const featNames: string[] = [];
      if (archetypeFeat) featNames.push(archetypeFeat.title);
      if (faithFeatId) { const f = featMap.get(faithFeatId); if (f) featNames.push(f.title); }
      if (subfeat2Id) { const f = featMap.get(subfeat2Id); if (f) featNames.push(f.title); }
      if (subfeat3Id) { const f = featMap.get(subfeat3Id); if (f) featNames.push(f.title); }

      const { data, error } = await supabase.functions.invoke("generate-character-details", {
        body: {
          type: "description",
          archetype: archetypeFeat?.title ?? "Unknown",
          faith: faithFeatId ? featMap.get(faithFeatId)?.title ?? "None" : "None",
          feats: featNames,
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

  // Skip: create blank character
  const handleSkip = async () => {
    await createCharacter("Blank", null, null);
  };

  // Final creation
  const createCharacter = async (
    charName: string,
    charDesc: string | null,
    charPortrait: string | null,
  ) => {
    if (!user) return;
    setCreating(true);
    try {
      // 1. Insert character
      const { data: charData, error: charError } = await supabase
        .from("characters")
        .insert({
          user_id: user.id,
          name: charName,
          description: charDesc,
          portrait_url: charPortrait,
        } as any)
        .select()
        .single();
      if (charError) throw charError;
      const characterId = charData.id;

      // 2. Insert archetype as level 1 feat
      if (archetypeFeatId) {
        const { data: cfData, error: cfError } = await supabase
          .from("character_feats")
          .insert({ character_id: characterId, feat_id: archetypeFeatId, level: 1 })
          .select()
          .single();
        if (cfError) throw cfError;

        // 3. Insert subfeats
        const subfeatsToInsert: { character_feat_id: string; slot: number; subfeat_id: string }[] = [];

        if (faithFeatId && faithSlot !== null) {
          subfeatsToInsert.push({ character_feat_id: cfData.id, slot: faithSlot, subfeat_id: faithFeatId });
        }
        if (subfeat2Id && subfeat2Slot !== null) {
          subfeatsToInsert.push({ character_feat_id: cfData.id, slot: subfeat2Slot, subfeat_id: subfeat2Id });
        }
        if (subfeat3Id && subfeat3Slot !== null) {
          subfeatsToInsert.push({ character_feat_id: cfData.id, slot: subfeat3Slot, subfeat_id: subfeat3Id });
        }

        if (subfeatsToInsert.length > 0) {
          const { error: sfError } = await supabase
            .from("character_feat_subfeats")
            .insert(subfeatsToInsert);
          if (sfError) throw sfError;
        }
      }

      // 4. If in a game, set character_id on game_players
      if (gameId) {
        await supabase
          .from("game_players")
          .update({ character_id: characterId })
          .eq("game_id", gameId)
          .eq("user_id", user.id);
      }

      queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      onCreated(characterId);
    } catch (e: any) {
      toast({ title: "Error creating character", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleFinalCreate = () => {
    createCharacter(name || "Blank", description || null, portraitUrl);
  };

  // Portrait handlers
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const tempId = crypto.randomUUID();
    const filePath = `${user.id}/${tempId}.png`;
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
      const featNames: string[] = [];
      if (archetypeFeatId) featNames.push(featMap.get(archetypeFeatId)?.title ?? "");
      if (faithFeatId) featNames.push(featMap.get(faithFeatId)?.title ?? "");
      if (subfeat2Id) featNames.push(featMap.get(subfeat2Id)?.title ?? "");
      if (subfeat3Id) featNames.push(featMap.get(subfeat3Id)?.title ?? "");

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

  const renderFeatList = (feats: Feat[], onSelect: (id: string) => void, _selectedId?: string | null) => (
    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
      {feats.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No feats found.</p>
      ) : feats.map(f => (
        <FeatListItem
          key={f.id}
          feat={{ ...f, description: descriptionMap.get(f.id) ?? null }}
          expanded={expandedFeatId === f.id}
          onToggleExpand={() => setExpandedFeatId(expandedFeatId === f.id ? null : f.id)}
          expandedContent={
            <Button size="sm" className="mt-2 w-full" onClick={() => onSelect(f.id)}>
              Pick this feat
            </Button>
          }
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

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1.5 mb-4">
      {[1, 2, 3, 4, 5].map(s => {
        const isSkipped =
          (s === 2 && shouldSkipFaith) ||
          (s === 3 && shouldSkipSubfeat2) ||
          (s === 4 && shouldSkipSubfeat3);
        if (isSkipped) return null;
        return (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              s === step ? "w-6 bg-primary" : s < step ? "w-3 bg-primary/50" : "w-3 bg-muted"
            }`}
          />
        );
      })}
    </div>
  );

  const skipButton = (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground gap-1"
      onClick={handleSkip}
      disabled={creating}
    >
      <SkipForward className="h-3.5 w-3.5" /> Skip
    </Button>
  );

  // Reusable renderer for subfeat steps (step 3 and step 4)
  const renderSubfeatStep = (
    stepNum: number,
    slotInfo: NonNullable<typeof subfeat2Info>,
    options: ReturnType<typeof resolveSubfeatOptions>,
    setId: (id: string | null) => void,
    setSlot: (slot: number | null) => void,
  ) => {
    const isFixed = options?.type === "fixed";
    return (
      <div className="space-y-4">
        {renderStepIndicator()}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPrevStep(stepNum)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-display text-lg text-foreground">
              {isFixed ? "Granted Ability" : "Choose Your Specialty"}
            </h3>
          </div>
          {skipButton}
        </div>

        {isFixed && options.type === "fixed" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your archetype grants you this ability by default:
            </p>
            <div className="ring-2 ring-primary rounded">
              <FeatListItem
                feat={{ ...options.feat, description: descriptionMap.get(options.feat.id) ?? null }}
                expanded={expandedFeatId === options.feat.id}
                onToggleExpand={() => setExpandedFeatId(expandedFeatId === options.feat.id ? null : options.feat.id)}
              />
            </div>
            <Button onClick={() => goToNextStep(stepNum)} className="w-full font-display gap-2">
              <ChevronRight className="h-4 w-4" /> Continue
            </Button>
          </div>
        ) : options?.type === "list" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your archetype lets you choose one of these abilities:
            </p>
            {slotInfo.optional && (
              <button
                onClick={() => {
                  setId(null);
                  setSlot(null);
                  goToNextStep(stepNum);
                }}
                className="w-full text-left p-3 rounded border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Skip this</span>
                  <span className="text-xs text-muted-foreground">— I'll choose later</span>
                </div>
              </button>
            )}
            {renderSearchBar()}
            {renderFeatList(filterBySearch(options.feats), (id) => {
              setId(id);
              setSlot(slotInfo.slot);
              goToNextStep(stepNum);
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
        {renderFeatList(filterBySearch(archetypes), (id) => {
          setArchetypeFeatId(id);
          setStep(2);
          setSearchTerm("");
          setExpandedFeatId(null);
        })}
      </div>
    );
  }

  // Step 2: Faith
  if (step === 2) {
    const combinedFaithFeats = [...faithFeats, ...darkFaithFeats];
    return (
      <div className="space-y-4">
        {renderStepIndicator()}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPrevStep(2)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-display text-lg text-foreground">Faith</h3>
          </div>
          {skipButton}
        </div>
        <p className="text-sm text-muted-foreground">
          Faith is a powerful roleplaying constraint. In exchange, your character gains one extra save.
          {faithInfo?.allowsDarkFaith && (
            <span className="block mt-1 text-destructive/80">
              Your archetype also allows Dark Faith — a forbidden path with its own rewards.
            </span>
          )}
        </p>

        {/* None option */}
        <button
          onClick={() => {
            setFaithFeatId(null);
            setFaithSlot(null);
            goToNextStep(2);
          }}
          className="w-full text-left p-3 rounded border border-border hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">No Faith</span>
            <span className="text-xs text-muted-foreground">— Walk your own path</span>
          </div>
        </button>

        {renderSearchBar()}
        {renderFeatList(filterBySearch(combinedFaithFeats), (id) => {
          setFaithFeatId(id);
          setFaithSlot(faithInfo!.slot);
          goToNextStep(2);
        })}
      </div>
    );
  }

  // Step 3: Subfeat 2
  if (step === 3 && subfeat2Info) {
    return renderSubfeatStep(3, subfeat2Info, subfeat2Options, setSubfeat2Id, setSubfeat2Slot);
  }

  // Step 4: Subfeat 3
  if (step === 4 && subfeat3Info) {
    return renderSubfeatStep(4, subfeat3Info, subfeat3Options, setSubfeat3Id, setSubfeat3Slot);
  }

  // Step 5: Summary, Name, Portrait
  if (step === 5) {
    const initials = name ? name.slice(0, 2).toUpperCase() : "??";
    return (
      <div className="space-y-5">
        {renderStepIndicator()}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPrevStep(5)}>
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
          {faithFeatId && (
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Faith:</span> {featMap.get(faithFeatId)?.title}
            </p>
          )}
          {subfeat2Id && (
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Specialty:</span> {featMap.get(subfeat2Id)?.title}
            </p>
          )}
          {subfeat3Id && (
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Extra Feat:</span> {featMap.get(subfeat3Id)?.title}
            </p>
          )}
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
          onClick={handleFinalCreate}
          disabled={creating || !name.trim()}
          className="w-full font-display gap-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Create Character
        </Button>
      </div>
    );
  }

  return null;
};

export default CharacterCreationWizard;
