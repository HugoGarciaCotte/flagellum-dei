import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => (
  <span className={cn("font-serif text-primary leading-none", className)}>🜹</span>
);

export default Logo;
