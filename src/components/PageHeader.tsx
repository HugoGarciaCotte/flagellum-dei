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
    <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          {leftAction}
          <Logo className="text-xl text-primary" />
          <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            {icon && icon}
            {title}
          </h1>
          {badge}
        </div>
        {rightActions && (
          <div className="flex items-center gap-2">
            {rightActions}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
