import { useMemo } from "react";
import { useLocalRow } from "@/hooks/useLocalData";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PortraitViewer from "@/components/PortraitViewer";
import { getFeatById } from "@/data/feats";
import FeatDetailsDisplay from "@/components/FeatDetailsDisplay";
import { useTranslation } from "@/i18n/useTranslation";

interface CharacterDetailsProps {
  characterId: string;
}

interface FeatRow {
  feat_id: string;
  level?: number;
  is_free?: boolean;
  speciality?: string | null;
  subfeats?: { slot: number; feat_id: string }[];
}

const CharacterDetails = ({ characterId }: CharacterDetailsProps) => {
  const { t, locale } = useTranslation();
  const char = useLocalRow<any>("characters", characterId);

  const feats = useMemo(() => {
    const doc: FeatRow[] = Array.isArray(char?.feats) ? char.feats : [];
    return [...doc]
      .sort((a, b) => (a.is_free === b.is_free ? (a.level ?? 0) - (b.level ?? 0) : a.is_free ? 1 : -1))
      .map((f, i) => ({
        key: f.is_free ? `F${i}` : `L${f.level}`,
        label: f.is_free ? t("character.details.free") : `${t("character.details.level")} ${f.level}`,
        feat_id: f.feat_id,
        speciality: f.speciality || null,
        subfeats: (f.subfeats ?? []) as { slot: number; feat_id: string }[],
      }));
  }, [char?.feats, locale, t]);

  if (!char) {
    return <div className="text-base text-muted-foreground py-4 text-center">{t("character.loading")}</div>;
  }

  const initials = (char.name || "?").slice(0, 2).toUpperCase();

  const renderFeat = (featId: string) => {
    const feat = getFeatById(featId, locale);
    if (!feat) return <span className="text-muted-foreground italic">{t("feats.unknownFeat")}</span>;
    return (
      <div className="space-y-1">
        <p className="font-display text-base text-foreground">{feat.title}</p>
        <FeatDetailsDisplay content={feat.content} rawContent={feat.raw_content} />
      </div>
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
            {feats.map((f) => (
              <li
                key={f.key}
                className="rounded-md border border-border/60 bg-card/50 p-3 space-y-2 gold-glow-box"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">{renderFeat(f.feat_id)}</div>
                  <span className="text-xs uppercase tracking-wider text-primary font-display shrink-0">
                    {f.label}
                  </span>
                </div>
                {f.speciality && (
                  <p className="text-sm text-muted-foreground italic">({f.speciality})</p>
                )}
                {f.subfeats.length > 0 && (
                  <ul className="pl-3 mt-1 space-y-2 border-l border-border/60">
                    {f.subfeats.map((sf) => (
                      <li key={sf.slot} className="pl-2">
                        {renderFeat(sf.feat_id)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CharacterDetails;
