import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useIsOwner } from "@/hooks/useIsOwner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Sparkles, AlertTriangle, Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";
import en from "@/i18n/en";
import { downloadFile } from "@/lib/downloadFile";

const SUPPORTED_LOCALES = ["fr"] as const;
type TargetLocale = (typeof SUPPORTED_LOCALES)[number];
const LOCALE_LABELS: Record<string, string> = { fr: "Français" };

/** Group keys by screen (first segment before the dot) */
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

  // Load DB translations
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

  const orphanKeys = useMemo(
    () => Object.keys(dbTranslations).filter((k) => !(k in en)),
    [dbTranslations],
  );

  const missingCount = useMemo(
    () => allKeys.filter((k) => !editValues[k] || editValues[k] === en[k]).length,
    [allKeys, editValues],
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
      toast({ title: "Saved", description: key });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSavingKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
  };

  const handleGenerate = async (key: string) => {
    setGeneratingKeys((prev) => new Set(prev).add(key));
    try {
      const screen = key.split(".")[0];
      // Build HTML context from surrounding keys on the same screen
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
        // Auto-save
        const screenName = key.split(".")[0];
        await supabase.from("translations").upsert(
          { key, locale: activeLocale, value: translated, screen: screenName, updated_at: new Date().toISOString() },
          { onConflict: "key,locale" },
        );
        setDbTranslations((prev) => ({ ...prev, [key]: translated }));
      }
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e.message, variant: "destructive" });
    }
    setGeneratingKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
  };

  const handleGenerateAll = async () => {
    const missing = allKeys.filter((k) => !editValues[k] || editValues[k] === en[k]);
    if (missing.length === 0) {
      toast({ title: "All translations are complete!" });
      return;
    }
    setGeneratingAll(true);
    let done = 0;
    for (const key of missing) {
      try {
        await handleGenerate(key);
        done++;
      } catch {
        // continue with next
      }
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
    }
    setGeneratingAll(false);
    toast({ title: `Generated ${done}/${missing.length} translations` });
  };

  const handleDownloadAndClear = async () => {
    // Build JSON from DB translations
    const { data } = await supabase
      .from("translations")
      .select("key, value, locale");
    if (!data || data.length === 0) {
      toast({ title: "No translations to download", variant: "destructive" });
      return;
    }
    const output: Record<string, Record<string, string>> = {};
    for (const row of data) {
      (output[row.locale] ??= {})[row.key] = row.value;
    }
    downloadFile("translations.json", JSON.stringify(output, null, 2), "application/json");

    // Clear DB
    const { error } = await supabase.from("translations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast({ title: "Download succeeded but DB clear failed", description: error.message, variant: "destructive" });
    } else {
      setDbTranslations({});
      setEditValues({});
      toast({ title: "Translations downloaded & DB cleared" });
    }
  };

  if (roleLoading) return <FullPageLoader />;
  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">Access denied.</p>
        <Button onClick={() => navigate("/")} variant="outline">Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Translations"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <main className="container py-8 max-w-5xl space-y-6">
        {/* Missing banner */}
        {missingCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/30 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="font-display text-sm text-destructive">
              <strong>{missingCount}</strong> translation{missingCount > 1 ? "s" : ""} missing or identical to English in{" "}
              <strong>{LOCALE_LABELS[activeLocale]}</strong>
            </p>
          </div>
        )}

        {orphanKeys.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-display text-sm text-amber-600 dark:text-amber-400">
                <strong>{orphanKeys.length}</strong> key{orphanKeys.length > 1 ? "s" : ""} stored in the DB but not found in the hardcoded JSON:{" "}
                <code className="text-xs">{orphanKeys.slice(0, 5).join(", ")}{orphanKeys.length > 5 ? `, … +${orphanKeys.length - 5} more` : ""}</code>
              </p>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleGenerateAll}
            disabled={generatingAll}
            className="gap-2 font-display"
          >
            {generatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generatingAll ? "Generating..." : "Generate All Missing"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadAndClear}
            className="gap-2 font-display"
          >
            <Download className="h-4 w-4" /> Download JSON & Clear DB
          </Button>
          <div className="ml-auto text-sm text-muted-foreground font-display">
            {allKeys.length} keys · {allKeys.length - missingCount} translated
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {screens.map((screen) => {
              const keys = grouped[screen];
              const screenMissing = keys.filter((k) => !editValues[k] || editValues[k] === en[k]).length;
              return (
                <AccordionItem key={screen} value={screen} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm font-bold uppercase tracking-wider">{screen}</span>
                      <Badge variant="secondary" className="text-xs">{keys.length} keys</Badge>
                      {screenMissing > 0 && (
                        <Badge variant="destructive" className="text-xs">{screenMissing} missing</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {keys.map((key) => {
                        const isMissing = !editValues[key] || editValues[key] === en[key];
                        const isChanged = editValues[key] !== dbTranslations[key] && editValues[key] !== en[key];
                        return (
                          <div
                            key={key}
                            className={`rounded-md border p-3 space-y-2 ${isMissing ? "border-destructive/30 bg-destructive/5" : "border-border"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <code className="text-xs text-muted-foreground break-all">{key}</code>
                              {isMissing && (
                                <Badge variant="destructive" className="text-[10px] shrink-0">MISSING</Badge>
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
                                title="Generate with AI"
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
                                  title="Save"
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
