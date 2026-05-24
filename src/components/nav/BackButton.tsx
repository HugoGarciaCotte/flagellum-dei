import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  /** Explicit parent route. If omitted and no onClick, falls back to navigate(-1). */
  to?: string;
  /** Override default navigation (e.g. wizard previous-step handler). */
  onClick?: () => void;
  /** Custom aria-label / tooltip. Defaults to t("nav.back"). */
  label?: string;
  className?: string;
}

/**
 * Standard "back" control. Use for: going up one level in the route hierarchy,
 * or stepping back in a multi-step wizard. Never use to dismiss a dialog —
 * that's what CloseButton is for.
 */
const BackButton = ({ to, onClick, label, className }: BackButtonProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handleClick = () => {
    if (onClick) return onClick();
    if (to) return navigate(to);
    navigate(-1);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label={label ?? t("nav.back")}
      className={cn(
        "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
};

export default BackButton;
