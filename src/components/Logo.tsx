import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("inline-block", className)}
    style={{ width: "1em", height: "1em" }}
  >
    <text
      x="256" y="280"
      fontSize="420"
      fill="currentColor"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="serif"
    >
      🜹
    </text>
  </svg>
);

export default Logo;
