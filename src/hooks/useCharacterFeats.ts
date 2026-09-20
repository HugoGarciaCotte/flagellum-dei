import { useMemo } from "react";
import { useLocalRows } from "@/hooks/useLocalData";
import type { FeatExhaustionState } from "@/lib/featExhaustion";

export interface CharacterSubfeatDocument extends Partial<FeatExhaustionState> {
  slot: number;
  feat_id: string;
}

export interface CharacterFeatDocument extends Partial<FeatExhaustionState> {
  feat_id: string;
  level?: number;
  is_free?: boolean;
  note?: string | null;
  speciality?: string | null;
  subfeats?: CharacterSubfeatDocument[];
}

interface LegacyFeat extends CharacterFeatDocument {
  id: string;
  character_id: string;
}

interface LegacySubfeat extends Partial<FeatExhaustionState> {
  character_feat_id: string;
  slot: number;
  subfeat_id: string;
}

/** One document for viewing and editing, including caches from before migration. */
export function useCharacterFeats(characterId: string, document: unknown): CharacterFeatDocument[] {
  const legacyFeats = useLocalRows<LegacyFeat>("character_feats", { character_id: characterId });
  const legacySubfeats = useLocalRows<LegacySubfeat>("character_feat_subfeats");

  return useMemo(() => {
    // An empty document is intentional, e.g. after removing the last feat.
    // Never resurrect old cached rows once an embedded document exists.
    if (Array.isArray(document)) return document as CharacterFeatDocument[];
    return legacyFeats.map((feat) => ({
      feat_id: feat.feat_id,
      level: feat.level,
      is_free: feat.is_free,
      note: feat.note ?? null,
      speciality: feat.speciality ?? null,
      exhausted_at: feat.exhausted_at ?? null,
      exhausted_scenario_id: feat.exhausted_scenario_id ?? null,
      used_forever: !!feat.used_forever,
      subfeats: legacySubfeats
        .filter((subfeat) => subfeat.character_feat_id === feat.id)
        .map((subfeat) => ({
          slot: subfeat.slot,
          feat_id: subfeat.subfeat_id,
          exhausted_at: subfeat.exhausted_at ?? null,
          exhausted_scenario_id: subfeat.exhausted_scenario_id ?? null,
          used_forever: !!subfeat.used_forever,
        }))
        .sort((a, b) => a.slot - b.slot),
    }));
  }, [document, legacyFeats, legacySubfeats]);
}
