import { Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { useLocation } from "react-router-dom";

const locales = [
  { code: "en" as const, label: "English", flag: "🇬🇧" },
  { code: "fr" as const, label: "Français", flag: "🇫🇷" },
];

const LanguagePicker = () => {
  const { locale, setLocale } = useTranslation();
  const { pathname } = useLocation();

  if (pathname !== "/") return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="fixed bottom-3 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 border border-border/50 backdrop-blur text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          aria-label="Change language"
        >
          <Globe className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-40 p-1"
      >
        {locales.map((l) => (
          <Button
            key={l.code}
            variant={locale === l.code ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start gap-2 font-display text-xs"
            onClick={() => setLocale(l.code)}
          >
            <span>{l.flag}</span>
            {l.label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default LanguagePicker;
