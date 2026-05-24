import { ReactNode, useMemo } from "react";
import { useLocalRow } from "@/hooks/useLocalData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PortraitViewer from "@/components/PortraitViewer";
import { getFeatById } from "@/data/feats";
import { useTranslation } from "@/i18n/useTranslation";

interface CharacterListItemProps {
  character: { id: string; name: string; description?: string | null; portrait_url?: string | null };
  /** Optional extra slot for read-only adornments (e.g. a "current" badge). */
  actions?: ReactNode;
  /** When provided, the whole card becomes clickable and a view glyph is shown on the right. */
  onView?: () => void;
}

const CharacterListItem = ({ character, actions, onView }: CharacterListItemProps) => {
  const { t, locale } = useTranslation();
  const charRow = useLocalRow<any>("characters", character.id);

  const feats = useMemo(() => {
    const doc: any[] = Array.isArray(charRow?.feats) ? charRow.feats : [];
    return [...doc]
      .sort((a, b) => (a.is_free === b.is_free ? (a.level ?? 0) - (b.level ?? 0) : a.is_free ? 1 : -1))
      .map((f, i) => ({
        key: f.is_free ? `F${i}` : `L${f.level}`,
        feat_id: f.feat_id,
        subfeats: (f.subfeats ?? []) as { slot: number; feat_id: string }[],
      }));
  }, [charRow?.feats]);


  const initials = character.name.slice(0, 2).toUpperCase();
  const clickable = !!onView;

  return (
    <Card
      className={`border-border hover:border-primary/40 transition-colors gold-glow-box ${clickable ? "cursor-pointer" : ""}`}
      onClick={clickable ? onView : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable
        ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView!(); } }
        : undefined}
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
            {clickable && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onView!(); }}
                aria-label={t("character.view")}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                title={t("character.view")}
              >
                <span className="text-base" aria-hidden="true">🜍</span>
              </button>
            )}
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
              return (
                <li key={cf.key}>
                  {featTitle}
                  {cf.subfeats.length > 0 && (
                    <ul className="list-[circle] list-inside ml-4 mt-0.5 space-y-0.5">
                      {cf.subfeats.map((sf) => {
                        const sfTitle = getFeatById(sf.feat_id, locale)?.title || t("feats.unknownFeat");
                        return <li key={sf.slot}>{sfTitle}</li>;
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
