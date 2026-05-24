import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";

interface CloseButtonProps {
  onClose: () => void;
  /** Custom aria-label / tooltip. Defaults to t("nav.close"). */
  label?: string;
  tone?: "default" | "destructive";
  className?: string;
}

/**
 * Standard "close / dismiss" control. Use for: dismissing dialogs, sheets,
 * panels, popovers. Never use to navigate up a hierarchy — that's BackButton.
 */
const CloseButton = ({ onClose, label, tone = "default", className }: CloseButtonProps) => {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClose}
      aria-label={label ?? t("nav.close")}
      className={cn(
        "h-8 w-8 shrink-0",
        tone === "destructive"
          ? "text-muted-foreground hover:text-destructive"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

export default CloseButton;
