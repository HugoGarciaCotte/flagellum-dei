import { cn } from "@/lib/utils";
import logoSvg from "@/assets/logo.svg";

const Logo = ({ className }: { className?: string }) => (
  <img
    src={logoSvg}
    alt="🜹"
    className={cn("inline-block", className)}
    style={{ width: "1em", height: "1em" }}
  />
);

export default Logo;
