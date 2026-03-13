import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import en from "./en";
import fr from "./fr";

type Locale = "en" | "fr";

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  allKeys: string[];
}

const dicts: Record<Locale, Record<string, string>> = { en, fr };

const detectLocale = (): Locale => {
  const stored = localStorage.getItem("locale");
  if (stored === "en" || stored === "fr") return stored;
  const nav = navigator.language || "";
  return nav.startsWith("fr") ? "fr" : "en";
};

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  allKeys: [],
});

export const useI18n = () => useContext(I18nContext);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const [dbOverrides, setDbOverrides] = useState<Record<string, string>>({});

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem("locale", l);
    setLocaleState(l);
  }, []);

  // Load DB overrides for active locale
  useEffect(() => {
    if (locale === "en") {
      setDbOverrides({});
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("translations")
          .select("key, value")
          .eq("locale", locale);
        if (!cancelled && data) {
          const map: Record<string, string> = {};
          for (const row of data) map[row.key] = row.value;
          setDbOverrides(map);
        }
      } catch {
        // offline — will use static dict
      }
    };
    load();
    return () => { cancelled = true; };
  }, [locale]);

  const t = useCallback(
    (key: string): string => {
      // Priority: DB override → static locale dict → English fallback → key itself
      if (dbOverrides[key]) return dbOverrides[key];
      if (dicts[locale]?.[key]) return dicts[locale][key];
      return dicts.en[key] || key;
    },
    [locale, dbOverrides],
  );

  const allKeys = useMemo(() => Object.keys(en), []);

  const value = useMemo(
    () => ({ locale, setLocale, t, allKeys }),
    [locale, setLocale, t, allKeys],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
