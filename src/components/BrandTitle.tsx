import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

interface BrandTitleProps {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
}

const BrandTitle = ({ className, logoClassName, textClassName }: BrandTitleProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <Logo className={cn("text-2xl text-primary", logoClassName)} />
    <span className={cn("font-display text-sm font-bold tracking-[0.1em] uppercase text-foreground hidden sm:inline leading-none", textClassName)}>
      Flagellum Dei
    </span>
  </div>
);

export default BrandTitle;
