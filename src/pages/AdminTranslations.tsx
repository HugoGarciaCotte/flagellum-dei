import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useIsOwner } from "@/hooks/useIsOwner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Sparkles, AlertTriangle, Loader2, Check, Copy, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";
import en from "@/i18n/en";
import { useTranslation } from "@/i18n/useTranslation";
import staticFr from "@/i18n/fr";
import { downloadFile } from "@/lib/downloadFile";

const SUPPORTED_LOCALES = ["fr"] as const;
type TargetLocale = (typeof SUPPORTED_LOCALES)[number];
const LOCALE_LABELS: Record<string, string> = { fr: "Français" };

const groupByScreen = (keys: string[]) => {
  const map: Record<string, string[]> = {};
  for (const key of keys) {
    const screen = key.split(".")[0] || "other";
    (map[screen] ??= []).push(key);
  }
  return map;
};

const AdminTranslations = () => {
  const navigate = useNavigate();
  const { isOwner, isLoading: roleLoading } = useIsOwner();
  const { t } = useTranslation();
  const [activeLocale, setActiveLocale] = useState<TargetLocale>("fr");
  const [dbTranslations, setDbTranslations] = useState<Record<string, string>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generatingKeys, setGeneratingKeys] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  const allKeys = useMemo(() => Object.keys(en), []);
  const grouped = useMemo(() => groupByScreen(allKeys), [allKeys]);
  const screens = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("translations")
          .select("key, value")
          .eq("locale", activeLocale);
        if (!cancelled && data) {
          const map: Record<string, string> = {};
          for (const row of data) map[row.key] = row.value;
          setDbTranslations(map);
          setEditValues(map);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [activeLocale]);

  const isTrulyMissing = (k: string) =>
    (!editValues[k] || editValues[k] === en[k]) && (!staticFr[k] || staticFr[k] === en[k]);

  const missingCount = useMemo(
    () => allKeys.filter(isTrulyMissing).length,
    [allKeys, editValues],
  );

  const pendingExportCount = useMemo(
    () => allKeys.filter((k) => dbTranslations[k] && dbTranslations[k] !== en[k] && (!staticFr[k] || staticFr[k] === en[k])).length,
    [allKeys, dbTranslations],
  );

  const handleSave = async (key: string) => {
    const value = editValues[key];
    if (!value) return;
    setSavingKeys((prev) => new Set(prev).add(key));
    try {
      const screen = key.split(".")[0];
      const { error } = await supabase.from("translations").upsert(
        { key, locale: activeLocale, value, screen, updated_at: new Date().toISOString() },
        { onConflict: "key,locale" },
      );
      if (error) throw error;
      setDbTranslations((prev) => ({ ...prev, [key]: value }));
      toast({ title: t("adminTranslations.saved"), description: key });
    } catch (e: any) {
      toast({ title: t("adminTranslations.saveFailed"), description: e.message, variant: "destructive" });
    }
    setSavingKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
  };

  const handleGenerate = async (key: string) => {
    setGeneratingKeys((prev) => new Set(prev).add(key));
    try {
      const screen = key.split(".")[0];
      const siblings = grouped[screen] || [];
      const htmlContext = siblings
        .map((k) => `<div data-key="${k}">${en[k]}</div>`)
        .join("\n");

      const { data, error } = await supabase.functions.invoke("generate-translation", {
        body: { key, english_text: en[key], target_locale: activeLocale, screen, html_context: htmlContext },
      });
      if (error) throw error;
      const translated = data?.translated_text;
      if (translated) {
        setEditValues((prev) => ({ ...prev, [key]: translated }));
        const screenName = key.split(".")[0];
        await supabase.from("translations").upsert(
          { key, locale: activeLocale, value: translated, screen: screenName, updated_at: new Date().toISOString() },
          { onConflict: "key,locale" },
        );
        setDbTranslations((prev) => ({ ...prev, [key]: translated }));
      }
    } catch (e: any) {
      toast({ title: t("adminTranslations.aiGenerationFailed"), description: e.message, variant: "destructive" });
    }
    setGeneratingKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
  };

  const handleGenerateAll = async () => {
    const missing = allKeys.filter((k) => !editValues[k] || editValues[k] === en[k]);
    if (missing.length === 0) {
      toast({ title: t("adminTranslations.allComplete") });
      return;
    }
    setGeneratingAll(true);
    let done = 0;
    for (const key of missing) {
      try {
        await handleGenerate(key);
        done++;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    setGeneratingAll(false);
    toast({ title: t("adminTranslations.generatedCount").replace("{done}", String(done)).replace("{total}", String(missing.length)) });
  };

  const handleDownloadAndClear = async () => {
    const { data } = await supabase
      .from("translations")
      .select("key, value, locale");
    if (!data || data.length === 0) {
      toast({ title: t("adminTranslations.noTranslations"), variant: "destructive" });
      return;
    }
    const output: Record<string, Record<string, string>> = {};
    for (const row of data) {
      (output[row.locale] ??= {})[row.key] = row.value;
    }
    downloadFile("translations.json", JSON.stringify(output, null, 2), "application/json");

    const { error } = await supabase.from("translations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast({ title: t("adminTranslations.downloadClearFailed"), description: error.message, variant: "destructive" });
    } else {
      setDbTranslations({});
      setEditValues({});
      toast({ title: t("adminTranslations.downloadedCleared") });
    }
  };

  if (roleLoading) return <FullPageLoader />;
  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">{t("admin.accessDenied")}</p>
        <Button onClick={() => navigate("/")} variant="outline">{t("admin.returnHome")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t("admin.translations")}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <main className="container py-8 max-w-5xl space-y-6">
        {missingCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/30 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="font-display text-sm text-destructive" dangerouslySetInnerHTML={{ __html: t("adminTranslations.missingCount").replace("{count}", String(missingCount)).replace("{locale}", LOCALE_LABELS[activeLocale]) }} />
          </div>
        )}

        {pendingExportCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="font-display text-sm text-amber-700 dark:text-amber-300" dangerouslySetInnerHTML={{ __html: t("adminTranslations.pendingExport").replace("{count}", String(pendingExportCount)) }} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleGenerateAll}
            disabled={generatingAll}
            className="gap-2 font-display"
          >
            {generatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generatingAll ? t("adminTranslations.generating") : t("adminTranslations.generateAllMissing")}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadAndClear}
            className="gap-2 font-display"
          >
            <Download className="h-4 w-4" /> {t("adminTranslations.downloadJsonClearDb")}
          </Button>
          <div className="ml-auto text-sm text-muted-foreground font-display">
            {t("adminTranslations.keysCount").replace("{total}", String(allKeys.length)).replace("{translated}", String(allKeys.length - missingCount))}
          </div>
        </div>

        <Collapsible>
          <Card className="border-border">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-display">{t("adminTranslations.auditPromptTitle")}</CardTitle>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-muted-foreground">{t("adminTranslations.auditPromptDesc")}</p>
                <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap leading-relaxed border border-border">
{`Scan all .tsx files in src/pages/ and src/components/ (excluding src/components/ui/) for hardcoded user-facing text in JSX that is not wrapped in the t() translation function. Use search_files to find patterns like >Some English text< in JSX and string props like title=, description=, placeholder=, label= with literal values. For each hardcoded string found: 1) Add a new key to src/i18n/en.ts following the existing naming convention (screen.section.purpose), 2) Replace the hardcoded string with t('new.key') in the component. Skip className, variant, size, type, key, data-*, src, href attributes. Skip strings that are purely technical (e.g. channel names, event types).`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 font-display"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Scan all .tsx files in src/pages/ and src/components/ (excluding src/components/ui/) for hardcoded user-facing text in JSX that is not wrapped in the t() translation function. Use search_files to find patterns like >Some English text< in JSX and string props like title=, description=, placeholder=, label= with literal values. For each hardcoded string found: 1) Add a new key to src/i18n/en.ts following the existing naming convention (screen.section.purpose), 2) Replace the hardcoded string with t('new.key') in the component. Skip className, variant, size, type, key, data-*, src, href attributes. Skip strings that are purely technical (e.g. channel names, event types).`
                    );
                    toast({ title: t("adminTranslations.copiedClipboard") });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> {t("adminTranslations.copyPrompt")}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {screens.map((screen) => {
              const keys = grouped[screen];
              const screenMissing = keys.filter(isTrulyMissing).length;
              return (
                <AccordionItem key={screen} value={screen} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm font-bold uppercase tracking-wider">{screen}</span>
                      <Badge variant="secondary" className="text-xs">{keys.length} {t("adminTranslations.keysLabel")}</Badge>
                      {screenMissing > 0 && (
                        <Badge variant="destructive" className="text-xs">{screenMissing} {t("adminTranslations.missing").toLowerCase()}</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {keys.map((key) => {
                        const isMissing = isTrulyMissing(key);
                        const isChanged = editValues[key] !== dbTranslations[key] && editValues[key] !== en[key];
                        return (
                          <div
                            key={key}
                            className={`rounded-md border p-3 space-y-2 ${isMissing ? "border-destructive/30 bg-destructive/5" : "border-border"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <code className="text-xs text-muted-foreground break-all">{key}</code>
                              {isMissing && (
                                <Badge variant="destructive" className="text-[10px] shrink-0">{t("adminTranslations.missing")}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: en[key] }} />
                            <div className="flex gap-2">
                              <Input
                                value={editValues[key] || ""}
                                onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                placeholder={`${LOCALE_LABELS[activeLocale]} translation...`}
                                className="text-sm flex-1"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="shrink-0"
                                disabled={generatingKeys.has(key)}
                                onClick={() => handleGenerate(key)}
                              >
                                {generatingKeys.has(key) ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              {isChanged && (
                                <Button
                                  size="icon"
                                  variant="default"
                                  className="shrink-0"
                                  disabled={savingKeys.has(key)}
                                  onClick={() => handleSave(key)}
                                >
                                  {savingKeys.has(key) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </main>
    </div>
  );
};

export default AdminTranslations;
