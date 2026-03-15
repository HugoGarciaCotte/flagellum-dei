import { ReactNode } from "react";
import Logo from "@/components/Logo";

interface PageHeaderProps {
  title: string;
  icon?: ReactNode;
  leftAction?: ReactNode;
  rightActions?: ReactNode;
  badge?: ReactNode;
}

const PageHeader = ({ title, icon, leftAction, rightActions, badge }: PageHeaderProps) => {
  return (
    <header className="border-b border-primary/10 bg-card/50 backdrop-blur z-10 pt-[env(safe-area-inset-top)]">
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-1 py-2 sm:py-0 sm:h-14 sm:flex-nowrap sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {leftAction}
          <Logo className="text-xl text-primary shrink-0" />
          <h1 className="font-display text-base sm:text-xl font-bold text-foreground flex items-center gap-2 leading-none truncate min-w-0">
            {icon && icon}
            <span className="truncate">{title}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {badge}
          {rightActions}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
