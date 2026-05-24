import { useMemo, useState } from "react";
import { useLocalRow } from "@/hooks/useLocalData";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PortraitViewer from "@/components/PortraitViewer";
import { getFeatById, getFeatMeta, getFeatExhaustion } from "@/data/feats";
import FeatListItem from "@/components/FeatListItem";
import { useTranslation } from "@/i18n/useTranslation";
import { upsertRow } from "@/lib/localStore";
import { triggerPush } from "@/lib/syncManager";
import {
  isFeatExhausted,
  exhaustionLabelKind,
  type FeatExhaustionState,
} from "@/lib/featExhaustion";
import {
  useUserScenarioHistory,
  useCurrentScenarioId,
} from "@/hooks/useUserScenarioHistory";

interface CharacterDetailsProps {
  characterId: string;
}

interface FeatRow extends FeatExhaustionState {
  feat_id: string;
  level?: number;
  is_free?: boolean;
  speciality?: string | null;
  subfeats?: ({ slot: number; feat_id: string } & Partial<FeatExhaustionState>)[];
}

const CharacterDetails = ({ characterId }: CharacterDetailsProps) => {
  const { t, locale } = useTranslation();
  const char = useLocalRow<any>("characters", characterId);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const scenarioHistory = useUserScenarioHistory(char?.user_id);
  const currentScenarioId = useCurrentScenarioId(char?.user_id);

  const feats = useMemo(() => {
    const doc: FeatRow[] = Array.isArray(char?.feats) ? char.feats : [];
    return doc
      .map((f, docIndex) => ({ ...f, docIndex }))
      .sort((a, b) => (a.is_free === b.is_free ? (a.level ?? 0) - (b.level ?? 0) : a.is_free ? 1 : -1))
      .map((f, i) => ({
        docIndex: f.docIndex,
        key: f.is_free ? `F${i}` : `L${f.level}`,
        label: f.is_free ? t("character.details.free") : `${t("character.details.level")} ${f.level}`,
        feat_id: f.feat_id,
        is_free: !!f.is_free,
        level: f.level,
        speciality: f.speciality || null,
        subfeats: (f.subfeats ?? []) as ({ slot: number; feat_id: string } & Partial<FeatExhaustionState>)[],
        exhausted_at: f.exhausted_at ?? null,
        exhausted_scenario_id: f.exhausted_scenario_id ?? null,
        used_forever: !!f.used_forever,
      }));
  }, [char?.feats, locale, t]);


  if (!char) {
    return <div className="text-base text-muted-foreground py-4 text-center">{t("character.loading")}</div>;
  }

  const initials = (char.name || "?").slice(0, 2).toUpperCase();

  /** Mutate feats doc at a stable original document index. */
  const updateEntry = (docIndex: number, patch: Partial<FeatRow>) => {
    if (!char) return;
    const doc: FeatRow[] = Array.isArray(char.feats) ? char.feats : [];
    if (docIndex < 0 || docIndex >= doc.length) return;
    const next = doc.map((f, i) => (i === docIndex ? { ...f, ...patch } : f));
    upsertRow("characters", { ...char, feats: next, updated_at: new Date().toISOString() });
    triggerPush();
  };

  /** Mutate a subfeat entry on the parent feat at docIndex. */
  const updateSubfeat = (docIndex: number, slot: number, patch: Partial<FeatExhaustionState>) => {
    if (!char) return;
    const doc: FeatRow[] = Array.isArray(char.feats) ? char.feats : [];
    if (docIndex < 0 || docIndex >= doc.length) return;
    const parent = doc[docIndex];
    const subs = Array.isArray(parent.subfeats) ? parent.subfeats : [];
    const nextSubs = subs.map((s) => (s.slot === slot ? { ...s, ...patch } : s));
    const next = doc.map((f, i) => (i === docIndex ? { ...f, subfeats: nextSubs } : f));
    upsertRow("characters", { ...char, feats: next, updated_at: new Date().toISOString() });
    triggerPush();
  };




  const renderFeat = (
    featId: string,
    key: string,
    opts: {
      speciality?: string | null;
      compact?: boolean;
      state?: FeatExhaustionState;
      onUse?: () => void;
      onRecharge?: () => void;
    },
  ) => {
    const feat = getFeatById(featId, locale);
    if (!feat) return <span className="text-muted-foreground italic">{t("feats.unknownFeat")}</span>;
    const meta = getFeatMeta(feat);
    const exhaustion = getFeatExhaustion(feat);
    const exhausted = isFeatExhausted(opts.state, exhaustion, scenarioHistory);
    const labelKind = exhaustionLabelKind(opts.state, exhaustion, exhausted);
    return (
      <FeatListItem
        feat={{
          id: feat.id,
          title: feat.title,
          categories: feat.categories ?? [],
          description: meta.description ?? null,
          content: feat.content,
          raw_content: feat.raw_content,
        }}
        expanded={expandedKey === key}
        onToggleExpand={() => setExpandedKey(expandedKey === key ? null : key)}
        specialityValue={opts.speciality || undefined}
        specialities={meta.specialities ?? null}
        compact={opts.compact}
        exhaustionLabel={labelKind}
        onUse={
          opts.onUse && exhaustion !== "infinite" ? opts.onUse : undefined
        }
        onRecharge={opts.onRecharge && exhaustion !== "infinite" && exhaustion !== "transforms_on_use" && exhausted ? opts.onRecharge : undefined}
      />

    );
  };

  return (
    <div className="space-y-5">
      {/* Portrait + name + description */}
      <div className="flex flex-col items-center gap-3 text-center">
        <PortraitViewer src={char.portrait_url} alt={char.name} fileName={char.name}>
          <Avatar className="h-28 w-28 border-2 border-primary/30">
            {char.portrait_url ? <AvatarImage src={char.portrait_url} alt={char.name} /> : null}
            <AvatarFallback className="text-2xl font-display bg-muted">{initials}</AvatarFallback>
          </Avatar>
        </PortraitViewer>
        <h2 className="font-display text-2xl text-foreground">{char.name}</h2>
        {char.description && (
          <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line max-w-prose">
            {char.description}
          </p>
        )}
      </div>

      <div className="ornamental-divider" />

      {/* Feats */}
      <section className="space-y-3">
        <h3 className="font-display text-lg text-foreground flex items-center gap-2">
          <span className="text-primary" aria-hidden="true">🜂</span> {t("character.details.feats")}
        </h3>
        {feats.length === 0 ? (
          <p className="text-base text-muted-foreground italic">{t("character.details.noFeats")}</p>
        ) : (
          <ul className="space-y-3">
            {feats.map((f) => {
              const state: FeatExhaustionState = {
                exhausted_at: f.exhausted_at,
                exhausted_scenario_id: f.exhausted_scenario_id,
                used_forever: f.used_forever,
              };
              return (
                <li key={f.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-primary font-display shrink-0">
                      {f.label}
                    </span>
                  </div>
                  {renderFeat(f.feat_id, f.key, {
                    speciality: f.speciality,
                    compact: false,
                    state,
                    onUse: () => {
                      const feat = getFeatById(f.feat_id, locale);
                      const exhaustion = feat ? getFeatExhaustion(feat) : undefined;
                      if (exhaustion === "transforms_on_use") {
                        const target = getFeatMeta(feat!).transforms_to;
                        if (target) {
                          // Swap to the next-stage feat. Preserve subfeats; reset exhaustion state.
                          updateEntry(f.docIndex, {
                            feat_id: target,
                            exhausted_at: null,
                            exhausted_scenario_id: null,
                            used_forever: false,
                          });
                        }
                        return;
                      }
                      updateEntry(f.docIndex, exhaustion === "once_forever"
                        ? { used_forever: true, exhausted_at: new Date().toISOString(), exhausted_scenario_id: currentScenarioId ?? null }
                        : { exhausted_at: new Date().toISOString(), exhausted_scenario_id: currentScenarioId ?? null });
                    },

                    onRecharge: () => {
                      updateEntry(f.docIndex, { exhausted_at: null, exhausted_scenario_id: null, used_forever: false });
                    },
                  })}
                  {f.subfeats.length > 0 && (
                    <ul className="pl-3 mt-1 space-y-2 border-l border-border/60">
                      {f.subfeats.map((sf) => {
                        const sfState: FeatExhaustionState = {
                          exhausted_at: sf.exhausted_at ?? null,
                          exhausted_scenario_id: sf.exhausted_scenario_id ?? null,
                          used_forever: !!sf.used_forever,
                        };
                        return (
                          <li key={sf.slot} className="pl-2">
                            {renderFeat(sf.feat_id, `${f.key}-s${sf.slot}`, {
                              compact: true,
                              state: sfState,
                              onUse: () => {
                                const sFeat = getFeatById(sf.feat_id, locale);
                                const sExh = sFeat ? getFeatExhaustion(sFeat) : undefined;
                                updateSubfeat(f.docIndex, sf.slot, sExh === "once_forever"
                                  ? { used_forever: true, exhausted_at: new Date().toISOString(), exhausted_scenario_id: currentScenarioId ?? null }
                                  : { exhausted_at: new Date().toISOString(), exhausted_scenario_id: currentScenarioId ?? null });
                              },
                              onRecharge: () => {
                                updateSubfeat(f.docIndex, sf.slot, { exhausted_at: null, exhausted_scenario_id: null, used_forever: false });
                              },
                            })}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                </li>
              );
            })}

          </ul>
        )}
      </section>
    </div>
  );
};

export default CharacterDetails;
