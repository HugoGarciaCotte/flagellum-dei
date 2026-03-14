import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  slot: SubfeatSlot;
  onChange: (slot: SubfeatSlot) => void;
  onRemove: () => void;
}

const SubfeatSlotEditor = ({ slot, onChange, onRemove }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="border border-border rounded-md p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{t("adminFeats.slot").replace("{slot}", String(slot.slot))}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">{t("adminFeats.kind")}</Label>
          <Select value={slot.kind} onValueChange={(v) => onChange({ ...slot, kind: v as "fixed" | "list" | "type" })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">{t("adminFeats.fixed")}</SelectItem>
              <SelectItem value="list">{t("adminFeats.list")}</SelectItem>
              <SelectItem value="type">{t("adminFeats.type")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`optional-${slot.slot}`}
              checked={slot.optional ?? false}
              onCheckedChange={(c) => onChange({ ...slot, optional: !!c })}
            />
            <Label htmlFor={`optional-${slot.slot}`} className="text-xs">{t("adminFeats.optional")}</Label>
          </div>
        </div>
      </div>

      {slot.kind === "fixed" && (
        <div>
          <Label className="text-xs">{t("adminFeats.featTitle")}</Label>
          <Input
            className="h-8 text-xs"
            value={slot.feat_title ?? ""}
            onChange={(e) => onChange({ ...slot, feat_title: e.target.value })}
            placeholder={t("adminFeats.exactFeatTitle")}
          />
        </div>
      )}

      {slot.kind === "list" && (
        <div>
          <Label className="text-xs">{t("adminFeats.optionsPipeSeparated")}</Label>
          <Input
            className="h-8 text-xs"
            value={(slot.options ?? []).join(" | ")}
            onChange={(e) => onChange({ ...slot, options: e.target.value.split("|").map(s => s.trim()).filter(Boolean) })}
            placeholder={t("adminFeats.optionsPlaceholder")}
          />
        </div>
      )}

      {slot.kind === "type" && (
        <div>
          <Label className="text-xs">{t("adminFeats.filterCategory")}</Label>
          <Input
            className="h-8 text-xs"
            value={slot.filter ?? ""}
            onChange={(e) => onChange({ ...slot, filter: e.target.value })}
            placeholder={t("adminFeats.categoryFilter")}
          />
        </div>
      )}
    </div>
  );
};

export default SubfeatSlotEditor;
