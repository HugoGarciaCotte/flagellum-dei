import { ReactNode } from "react";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string | ReactNode;
  icon?: ReactNode;
  leftAction?: ReactNode;
  rightActions?: ReactNode;
  badge?: ReactNode;
  /** Show the Logo next to the title. Default true. */
  showLogo?: boolean;
  /** "translucent" (default) = bg-card/50 + backdrop-blur. "solid" = bg-card (for fullscreen dialogs). */
  tone?: "translucent" | "solid";
  /** Apply iOS safe-area top padding. Default true. */
  safeTop?: boolean;
}

const PageHeader = ({
  title,
  icon,
  leftAction,
  rightActions,
  badge,
  showLogo = true,
  tone = "translucent",
  safeTop = true,
}: PageHeaderProps) => {
  return (
    <header
      className={cn(
        "border-b z-10",
        tone === "solid"
          ? "border-border bg-card"
          : "border-primary/10 bg-card/50 backdrop-blur",
        safeTop && "pt-[env(safe-area-inset-top)]",
      )}
    >
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-1 py-2 sm:py-0 sm:h-14 sm:flex-nowrap sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {leftAction}
          {showLogo && <Logo className="text-xl text-primary shrink-0" />}
          <h1 className="font-display text-base sm:text-xl font-bold text-foreground flex items-center gap-2 leading-none truncate min-w-0">
            {icon && icon}
            <span className="truncate">{title}</span>
          </h1>
        </div>
        {(badge || rightActions) && (
          <div className="flex items-center gap-2 ml-auto">
            {badge}
            {rightActions}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
