import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => (
  <span className={cn("font-serif text-primary leading-none inline-flex items-center justify-center translate-y-[-0.05em]", className)}>🜹</span>
);

export default Logo;
