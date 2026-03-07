import { Badge } from "@/components/ui/badge";

const categoryStyles: Record<string, { label: string; className: string }> = {
  Archetype: {
    label: "Archetype",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30",
  },
  Prowess: {
    label: "Prowess",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30",
  },
  "General Feat": {
    label: "General",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30",
  },
  "Hidden Feat": {
    label: "Hidden",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30",
  },
  "Dark Feat": {
    label: "Dark",
    className: "bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/30",
  },
};

const FeatCategoryBadges = ({ categories }: { categories?: string[] | null }) => {
  if (!categories || categories.length === 0) return null;
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {categories.map((cat) => {
        const style = categoryStyles[cat];
        if (!style) return null;
        return (
          <Badge key={cat} className={style.className}>
            {style.label}
          </Badge>
        );
      })}
    </span>
  );
};

export default FeatCategoryBadges;
