import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";

import CharacterDetails from "@/components/CharacterDetails";
import CharacterSheet from "@/components/CharacterSheet";
import { useLocalRow } from "@/hooks/useLocalData";
import { softDeleteRow } from "@/lib/localStore";
import { triggerPush } from "@/lib/syncManager";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/useTranslation";

interface CharacterDetailsDialogProps {
  characterId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  /** When set, edit mode uses this scenarioLevel for the feat picker (player in active game) */
  scenarioLevel?: number;
  /** Edit-mode role passed down to CharacterSheet */
  editMode?: "player" | "gm";
  onDeleted?: () => void;
}

const CharacterDetailsDialog = ({
  characterId,
  open,
  onOpenChange,
  canEdit = false,
  canDelete = false,
  scenarioLevel,
  editMode = "player",
  onDeleted,
}: CharacterDetailsDialogProps) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const char = useLocalRow<any>("characters", characterId || undefined);

  // Reset to "details" view every time the dialog opens
  useEffect(() => {
    if (open) setEditing(false);
  }, [open, characterId]);

  const handleDelete = () => {
    if (!characterId) return;
    softDeleteRow("characters", characterId);
    triggerPush();
    setConfirmDelete(false);
    onOpenChange(false);
    toast({ title: t("character.delete.toastDeleted") });
    onDeleted?.();
  };

  const title = editing
    ? t("character.dialog.editTitle")
    : (char?.name || t("character.details.title"));

  const HeaderIconButton = ({
    children,
    label,
    onClick,
    tone = "default",
  }: {
    children: React.ReactNode;
    label: string;
    onClick?: () => void;
    tone?: "default" | "destructive";
  }) => (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 shrink-0 flex items-center justify-center ${
        tone === "destructive"
          ? "text-muted-foreground hover:text-destructive"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="fixed inset-0 max-w-none w-full h-full rounded-none p-0 translate-x-0 translate-y-0 left-0 top-0 border-none overflow-hidden [&>button:last-child]:hidden">
          <div className="flex flex-col h-full min-h-0">
            <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0 safe-top gap-2 min-h-12">
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                {editing && (
                  <HeaderIconButton
                    label={t("character.dialog.backToDetails")}
                    onClick={() => setEditing(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </HeaderIconButton>
                )}
                <span className="font-display text-base font-medium text-foreground truncate">{title}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!editing && canEdit && (
                  <HeaderIconButton
                    label={t("character.edit")}
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </HeaderIconButton>
                )}
                {!editing && canDelete && (
                  <HeaderIconButton
                    label={t("character.delete.cta")}
                    tone="destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </HeaderIconButton>
                )}
                <DialogClose asChild>
                  <HeaderIconButton label={t("nav.close")}>
                    <X className="h-4 w-4" />
                  </HeaderIconButton>
                </DialogClose>
              </div>
            </div>


            <ScrollArea className="flex-1">
              <div className="container max-w-2xl py-6 px-4">
                {characterId && (
                  editing ? (
                    <CharacterSheet
                      characterId={characterId}
                      mode={editMode}
                      scenarioLevel={scenarioLevel}
                      onDone={() => setEditing(false)}
                    />
                  ) : (
                    <CharacterDetails characterId={characterId} />
                  )
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("character.delete.confirmTitle")} "{char?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("character.delete.confirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dashboard.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("character.delete.cta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CharacterDetailsDialog;
