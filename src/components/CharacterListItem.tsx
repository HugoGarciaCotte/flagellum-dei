import { ReactNode, useMemo } from "react";
import { useLocalRow } from "@/hooks/useLocalData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PortraitViewer from "@/components/PortraitViewer";
import { getFeatById, getFeatExhaustion } from "@/data/feats";
import { useTranslation } from "@/i18n/useTranslation";
import { useUserScenarioHistory } from "@/hooks/useUserScenarioHistory";
import { isFeatExhausted, exhaustionLabelKind, type FeatExhaustionState } from "@/lib/featExhaustion";

interface CharacterListItemProps {
  character: { id: string; name: string; description?: string | null; portrait_url?: string | null };
  /** Optional extra slot for read-only adornments (e.g. a "current" badge). */
  actions?: ReactNode;
  /** Called when the card is clicked (not from interactive children). */
  onView?: (id: string) => void;
}

type SubfeatEntry = { slot: number; feat_id: string } & Partial<FeatExhaustionState>;

const CharacterListItem = ({ character, actions, onView }: CharacterListItemProps) => {
  const { t, locale } = useTranslation();
  const charRow = useLocalRow<any>("characters", character.id);
  const scenarioHistory = useUserScenarioHistory(charRow?.user_id);
  const clickable = !!onView;

  const feats = useMemo(() => {
    const doc: any[] = Array.isArray(charRow?.feats) ? charRow.feats : [];
    return [...doc]
      .sort((a, b) => (a.is_free === b.is_free ? (a.level ?? 0) - (b.level ?? 0) : a.is_free ? 1 : -1))
      .map((f, i) => ({
        key: f.is_free ? `F${i}` : `L${f.level}`,
        feat_id: f.feat_id,
        subfeats: (f.subfeats ?? []) as SubfeatEntry[],
        exhausted_at: f.exhausted_at ?? null,
        exhausted_scenario_id: f.exhausted_scenario_id ?? null,
        used_forever: !!f.used_forever,
      }));
  }, [charRow?.feats]);

  const computeLabel = (
    featId: string,
    state: FeatExhaustionState,
  ): "used" | "exhausted" | null => {
    const feat = getFeatById(featId, locale);
    if (!feat) return null;
    const exhaustion = getFeatExhaustion(feat);
    const exhausted = isFeatExhausted(state, exhaustion, scenarioHistory);
    return exhaustionLabelKind(state, exhaustion, exhausted);
  };

  const renderTag = (kind: "used" | "exhausted" | null) =>
    kind ? (
      <span className="ml-1 italic text-destructive/80">
        {kind === "used" ? t("feats.usedTag") : t("feats.exhaustedTag")}
      </span>
    ) : null;

  const initials = character.name.slice(0, 2).toUpperCase();

  return (
    <Card
      className={`border-border hover:border-primary/40 transition-colors gold-glow-box ${clickable ? "cursor-pointer" : ""}`}
      onClick={clickable ? () => onView(character.id) : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(character.id); } } : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div onClick={(e) => e.stopPropagation()}>
              <PortraitViewer src={character.portrait_url} alt={character.name} fileName={character.name}>
                <Avatar className="h-9 w-9 border border-primary/20">
                  {character.portrait_url ? (
                    <AvatarImage src={character.portrait_url} alt={character.name} />
                  ) : null}
                  <AvatarFallback className="text-sm font-display bg-muted">{initials}</AvatarFallback>
                </Avatar>
              </PortraitViewer>
            </div>
            <CardTitle className="font-display text-lg">{character.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        </div>
        {character.description && (
          <p className="text-base text-muted-foreground mt-1.5 leading-relaxed">{character.description}</p>
        )}
      </CardHeader>
      {feats && feats.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <ul className="list-disc list-inside text-base text-muted-foreground space-y-0.5">
            {feats.map((cf) => {
              const featTitle = getFeatById(cf.feat_id, locale)?.title || t("feats.unknownFeat");
              const labelKind = computeLabel(cf.feat_id, {
                exhausted_at: cf.exhausted_at,
                exhausted_scenario_id: cf.exhausted_scenario_id,
                used_forever: cf.used_forever,
              });
              return (
                <li key={cf.key} className={labelKind ? "opacity-70" : undefined}>
                  {featTitle}
                  {renderTag(labelKind)}
                  {cf.subfeats.length > 0 && (
                    <ul className="list-[circle] list-inside ml-4 mt-0.5 space-y-0.5">
                      {cf.subfeats.map((sf) => {
                        const sfTitle = getFeatById(sf.feat_id, locale)?.title || t("feats.unknownFeat");
                        const sfLabel = computeLabel(sf.feat_id, {
                          exhausted_at: sf.exhausted_at ?? null,
                          exhausted_scenario_id: sf.exhausted_scenario_id ?? null,
                          used_forever: !!sf.used_forever,
                        });
                        return (
                          <li key={sf.slot} className={sfLabel ? "opacity-70" : undefined}>
                            {sfTitle}
                            {renderTag(sfLabel)}
                          </li>
                        );
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
