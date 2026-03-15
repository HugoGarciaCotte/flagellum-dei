import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, ChevronDown, AlertTriangle, Check, Image, Loader2, Plus, Music, SeparatorHorizontal, ListMusic, Timer, Copy, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BackgroundInsertDialog from "@/components/BackgroundInsertDialog";
import AiImprovePanel from "@/components/AiImprovePanel";
import { getHardcodedScenarios, type Scenario } from "@/data/scenarios";
import { downloadFile } from "@/lib/downloadFile";
import { extractImageUrls } from "@/lib/parseWikitext";
import { toast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { invalidateScenarioOverrides, type ScenarioOverrideMap } from "@/lib/scenarioOverrides";
import { useAuth } from "@/contexts/AuthContext";

const SCENARIO_FIELDS = ["title", "teaser", "level", "content"] as const;
const FR_TRANSLATABLE_FIELDS = ["title", "teaser", "content"] as const;
type EditorLocale = "en" | "fr";

/** Try to resolve a Spotify URL to a human-readable name */
async function resolveSpotifyName(url: string): Promise<string | null> {
  // 1. Try sessionStorage token first
  let token = sessionStorage.getItem("spotify_access_token");

  // 2. If not available, try fetching from user profile
  if (!token) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("spotify_access_token")
          .eq("user_id", user.id)
          .single();
        if (profile?.spotify_access_token) {
          token = profile.spotify_access_token;
        }
      }
    } catch {}
  }

  if (!token) return null;

  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [type, id] = parts;
    const res = await fetch(`https://api.spotify.com/v1/${type}s/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.name || null;
    }
  } catch {}
  return null;
}

const ScenarioEditorPanel = () => {
  const { t } = useTranslation();
  const [hardcodedScenarios] = useState<Scenario[]>(() => getHardcodedScenarios().map(s => ({ ...s })));
  const [overrides, setOverrides] = useState<ScenarioOverrideMap>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [editorLocale, setEditorLocale] = useState<EditorLocale>("en");
  const [generatingFr, setGeneratingFr] = useState<Set<string>>(new Set());

  // Load overrides from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("scenario_overrides" as any)
        .select("scenario_id, field, value");
      if (!cancelled && data) {
        const map: ScenarioOverrideMap = new Map();
        for (const row of data as any[]) {
          if (!map.has(row.scenario_id)) map.set(row.scenario_id, new Map());
          map.get(row.scenario_id)!.set(row.field, row.value);
        }
        setOverrides(map);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const getEffective = useCallback((scenario: Scenario, field: string): any => {
    const dbVal = overrides.get(scenario.id)?.get(field);
    if (dbVal !== undefined) return dbVal;
    return (scenario as any)[field];
  }, [overrides]);

  const isOverridden = useCallback((scenarioId: string, field: string): boolean => {
    return overrides.get(scenarioId)?.has(field) ?? false;
  }, [overrides]);

  const overriddenCount = useMemo(() => {
    let count = 0;
    for (const [, fields] of overrides) {
      if (fields.size > 0) count++;
    }
    return count;
  }, [overrides]);

  const mergedScenarios = useMemo(() => {
    return hardcodedScenarios.map(scenario => {
      const fields = overrides.get(scenario.id);
      if (!fields || fields.size === 0) return scenario;
      const merged = { ...scenario };
      for (const [field, value] of fields) {
        (merged as any)[field] = value;
      }
      return merged;
    });
  }, [hardcodedScenarios, overrides]);

  const saveField = async (scenarioId: string, field: string, value: any) => {
    const key = `${scenarioId}:${field}`;
    setSavingFields(prev => new Set(prev).add(key));
    try {
      const { error } = await supabase.from("scenario_overrides" as any).upsert(
        { scenario_id: scenarioId, field, value, updated_at: new Date().toISOString() } as any,
        { onConflict: "scenario_id,field" }
      );
      if (error) throw error;
      setOverrides(prev => {
        const next = new Map(prev);
        if (!next.has(scenarioId)) next.set(scenarioId, new Map());
        next.get(scenarioId)!.set(field, value);
        return next;
      });
      invalidateScenarioOverrides();
    } catch (e: any) {
      toast({ title: t("adminScenarios.saveFailed"), description: e.message, variant: "destructive" });
    }
    setSavingFields(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  const revertField = async (scenarioId: string, field: string) => {
    const key = `${scenarioId}:${field}`;
    setSavingFields(prev => new Set(prev).add(key));
    try {
      const { error } = await supabase.from("scenario_overrides" as any)
        .delete()
        .eq("scenario_id", scenarioId)
        .eq("field", field);
      if (error) throw error;
      setOverrides(prev => {
        const next = new Map(prev);
        const fields = next.get(scenarioId);
        if (fields) {
          fields.delete(field);
          if (fields.size === 0) next.delete(scenarioId);
        }
        return next;
      });
      invalidateScenarioOverrides();
    } catch (e: any) {
      toast({ title: t("adminScenarios.revertFailed"), description: e.message, variant: "destructive" });
    }
    setSavingFields(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  const generateFrField = async (scenarioId: string, field: string, englishText: string) => {
    const key = `${scenarioId}:fr:${field}`;
    setGeneratingFr(prev => new Set(prev).add(key));
    try {
      const { data, error } = await supabase.functions.invoke("generate-translation", {
        body: { key: `scenario.${field}`, english_text: englishText, target_locale: "fr", screen: "scenario" },
      });
      if (error) throw error;
      if (data?.translated_text) {
        await saveField(scenarioId, `fr:${field}`, data.translated_text);
        toast({ title: t("adminEditor.translationSaved") });
      }
    } catch (e: any) {
      toast({ title: t("adminTranslations.aiGenerationFailed"), description: e.message, variant: "destructive" });
    }
    setGeneratingFr(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  const handleDownloadAndClear = async () => {
    const scenarios = mergedScenarios;

    // 1. Collect all image URLs from scenario contents
    const allUrls = new Set<string>();
    for (const s of scenarios) {
      if (s.content) {
        for (const url of extractImageUrls(s.content)) {
          allUrls.add(url);
        }
      }
    }

    // 2. Fetch images in parallel and build URL→local path map
    const urlMap = new Map<string, string>();
    const imageBlobs = new Map<string, Blob>();

    await Promise.all(
      Array.from(allUrls).map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const urlPath = new URL(url).pathname;
          const segments = urlPath.split("/");
          const localPath = `scenario-backgrounds/${segments.slice(-2).join("/")}`;
          urlMap.set(url, `/${localPath}`);
          imageBlobs.set(localPath, blob);
        } catch (e) {
          console.warn(`Failed to download image: ${url}`, e);
        }
      })
    );

    // 3. Rewrite content URLs to local paths
    const rewrittenScenarios = scenarios.map(s => {
      if (!s.content) return s;
      let content = s.content;
      for (const [originalUrl, localPath] of urlMap) {
        content = content.split(originalUrl).join(localPath);
      }
      return { ...s, content };
    });

    // 4. Generate scenarios.ts — include fr sub-object
    const lines: string[] = [
      "// Auto-generated from admin editor",
      `// Generated on ${new Date().toISOString()}`,
      "",
      'import { getCachedScenarioOverrides, applyScenarioOverrides } from "@/lib/scenarioOverrides";',
      "",
      "export interface Scenario {",
      "  id: string;",
      "  title: string;",
      "  teaser: string | null;",
      "  level: number | null;",
      "  content: string | null;",
      "  fr?: { title?: string; teaser?: string; content?: string };",
      "}",
      "",
      "/** Apply locale to a scenario — returns FR fields when available, else EN fallback. */",
      "export function localizeScenario(scenario: Scenario, locale?: string): Scenario {",
      '  if (!locale || locale === "en" || !scenario.fr) return scenario;',
      "  return {",
      "    ...scenario,",
      "    title: scenario.fr.title ?? scenario.title,",
      "    teaser: scenario.fr.teaser ?? scenario.teaser,",
      "    content: scenario.fr.content ?? scenario.content,",
      "  };",
      "}",
      "",
    ];

    rewrittenScenarios.forEach((s, i) => {
      const varName = `scenario${i + 1}`;
      lines.push(`export const ${varName}: Scenario = {`);
      lines.push(`  id: ${JSON.stringify(s.id)},`);
      lines.push(`  title: ${JSON.stringify(s.title)},`);
      lines.push(`  teaser: ${s.teaser ? JSON.stringify(s.teaser) : "null"},`);
      lines.push(`  level: ${s.level ?? "null"},`);
      lines.push(`  content: ${s.content ? JSON.stringify(s.content) : "null"},`);
      // Include fr sub-object if it has any fields
      if (s.fr && Object.values(s.fr).some(v => v != null)) {
        const frObj: Record<string, string> = {};
        if (s.fr.title) frObj.title = s.fr.title;
        if (s.fr.teaser) frObj.teaser = s.fr.teaser;
        if (s.fr.content) frObj.content = s.fr.content;
        lines.push(`  fr: ${JSON.stringify(frObj)},`);
      }
      lines.push("};");
      lines.push("");
    });

    const varNames = rewrittenScenarios.map((_, i) => `scenario${i + 1}`);
    lines.push(`const hardcodedScenarios: Scenario[] = [${varNames.join(", ")}];`);
    lines.push("");
    lines.push("/** Returns all scenarios, with DB overrides applied if loaded. */");
    lines.push("export function getAllScenarios(locale?: string): Scenario[] {");
    lines.push("  const overrides = getCachedScenarioOverrides();");
    lines.push("  let scenarios = hardcodedScenarios;");
    lines.push("  if (overrides && overrides.size > 0) {");
    lines.push("    scenarios = hardcodedScenarios.map(s => applyScenarioOverrides(s, overrides));");
    lines.push("  }");
    lines.push('  if (locale && locale !== "en") return scenarios.map(s => localizeScenario(s, locale));');
    lines.push("  return scenarios;");
    lines.push("}");
    lines.push("");
    lines.push("/** Returns the raw hardcoded scenarios without any overrides. */");
    lines.push("export function getHardcodedScenarios(): Scenario[] {");
    lines.push("  return hardcodedScenarios;");
    lines.push("}");
    lines.push("");
    lines.push("export function getScenarioById(id: string, locale?: string): Scenario | undefined {");
    lines.push("  const overrides = getCachedScenarioOverrides();");
    lines.push("  const scenario = hardcodedScenarios.find(s => s.id === id);");
    lines.push("  if (!scenario) return undefined;");
    lines.push("  const withOverrides = overrides ? applyScenarioOverrides(scenario, overrides) : scenario;");
    lines.push("  return locale ? localizeScenario(withOverrides, locale) : withOverrides;");
    lines.push("}");

    // 5. Build ZIP if there are images, otherwise just download .ts
    if (imageBlobs.size > 0) {
      const zip = new JSZip();
      zip.file("scenarios.ts", lines.join("\n"));

      for (const [path, blob] of imageBlobs) {
        zip.file(path, blob);
      }

      const readme = `## How to apply this export

Copy-paste this prompt into Lovable:

---

Upload the images from the scenario-backgrounds/ folder in the attached ZIP into public/scenario-backgrounds/ (preserving subfolder structure), and replace the contents of src/data/scenarios.ts with the scenarios.ts file from the ZIP.

---
`;
      zip.file("README.txt", readme);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = "scenarios-export.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      downloadFile("scenarios.ts", lines.join("\n"), "text/typescript");
    }

    // 7. Clear DB overrides
    const { error } = await supabase.from("scenario_overrides" as any)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast({ title: t("adminScenarios.downloadClearFailed"), description: error.message, variant: "destructive" });
    } else {
      setOverrides(new Map());
      invalidateScenarioOverrides();
      toast({ title: t("adminScenarios.downloadedCleared"), description: t("adminScenarios.downloadedClearedDesc") });
    }
  };

  const editingScenario = expandedId ? mergedScenarios.find(s => s.id === expandedId) : null;
  const editingHardcoded = expandedId ? hardcodedScenarios.find(s => s.id === expandedId) : null;

  return (
    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
      {/* Full-screen editor overlay */}
      {editingScenario && editingHardcoded && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Row 1: Back + Locale Toggle + Title + Level */}
          <div className="flex items-start gap-3 px-4 pt-4 pb-2">
            <Button variant="ghost" size="sm" className="shrink-0 mt-0.5" onClick={() => setExpandedId(null)}>
              ← {t("adminEditor.back")}
            </Button>
            {/* Locale toggle */}
            <div className="flex items-center gap-1 shrink-0 mt-1">
              <Button
                variant={editorLocale === "en" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setEditorLocale("en")}
              >
                🇬🇧
              </Button>
              <Button
                variant={editorLocale === "fr" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setEditorLocale("fr")}
              >
                🇫🇷
              </Button>
            </div>
            <div className="flex-1">
              <OverrideField
                label={t("adminScenarios.fieldTitle")}
                value={getEffective(editingHardcoded, "title") ?? ""}
                isOverridden={isOverridden(editingScenario.id, "title")}
                saving={savingFields.has(`${editingScenario.id}:title`)}
                onSave={(v) => saveField(editingScenario.id, "title", v)}
                onRevert={() => revertField(editingScenario.id, "title")}
                inline
                t={t}
              />
              {editorLocale === "fr" && (
                <TranslationField
                  label="🇫🇷"
                  value={getEffective(editingHardcoded, "fr:title") ?? ""}
                  isOverridden={isOverridden(editingScenario.id, "fr:title")}
                  saving={savingFields.has(`${editingScenario.id}:fr:title`)}
                  generating={generatingFr.has(`${editingScenario.id}:fr:title`)}
                  onSave={(v) => saveField(editingScenario.id, "fr:title", v || null)}
                  onRevert={() => revertField(editingScenario.id, "fr:title")}
                  onGenerate={() => generateFrField(editingScenario.id, "title", getEffective(editingHardcoded, "title") ?? "")}
                  t={t}
                />
              )}
            </div>
            <div className="w-24 shrink-0">
              <OverrideField
                label={t("adminScenarios.fieldLevel")}
                value={getEffective(editingHardcoded, "level") ?? ""}
                isOverridden={isOverridden(editingScenario.id, "level")}
                saving={savingFields.has(`${editingScenario.id}:level`)}
                onSave={(v) => saveField(editingScenario.id, "level", v === "" ? null : parseInt(v))}
                onRevert={() => revertField(editingScenario.id, "level")}
                type="number"
                inline
                t={t}
              />
            </div>
          </div>

          {/* Row 2: Teaser */}
          <div className="px-4 pb-2">
            <OverrideField
              label={t("adminScenarios.fieldTeaser")}
              value={getEffective(editingHardcoded, "teaser") ?? ""}
              isOverridden={isOverridden(editingScenario.id, "teaser")}
              saving={savingFields.has(`${editingScenario.id}:teaser`)}
              onSave={(v) => saveField(editingScenario.id, "teaser", v || null)}
              onRevert={() => revertField(editingScenario.id, "teaser")}
              multiline
              inline
              t={t}
            />
            {editorLocale === "fr" && (
              <TranslationField
                label="🇫🇷"
                value={getEffective(editingHardcoded, "fr:teaser") ?? ""}
                isOverridden={isOverridden(editingScenario.id, "fr:teaser")}
                saving={savingFields.has(`${editingScenario.id}:fr:teaser`)}
                generating={generatingFr.has(`${editingScenario.id}:fr:teaser`)}
                onSave={(v) => saveField(editingScenario.id, "fr:teaser", v || null)}
                onRevert={() => revertField(editingScenario.id, "fr:teaser")}
                onGenerate={() => generateFrField(editingScenario.id, "teaser", getEffective(editingHardcoded, "teaser") ?? "")}
                multiline
                t={t}
              />
            )}
          </div>

          {/* Row 3+: Content editor fills remaining space */}
          <div className="flex-1 px-4 pb-4 overflow-hidden flex flex-col min-h-0">
            <ContentEditor
              scenarioId={editingScenario.id}
              scenarioTitle={editingScenario.title}
              scenarioTeaser={editingScenario.teaser}
              value={getEffective(editingHardcoded, "content") ?? ""}
              isOverridden={isOverridden(editingScenario.id, "content")}
              saving={savingFields.has(`${editingScenario.id}:content`)}
              onSave={(v) => saveField(editingScenario.id, "content", v || null)}
              onRevert={() => revertField(editingScenario.id, "content")}
              fullScreen
              t={t}
            />
            {editorLocale === "fr" && (
              <div className="mt-2 border-t border-border pt-2">
                <TranslationField
                  label={`🇫🇷 ${t("adminScenarios.fieldContent")}`}
                  value={getEffective(editingHardcoded, "fr:content") ?? ""}
                  isOverridden={isOverridden(editingScenario.id, "fr:content")}
                  saving={savingFields.has(`${editingScenario.id}:fr:content`)}
                  generating={generatingFr.has(`${editingScenario.id}:fr:content`)}
                  onSave={(v) => saveField(editingScenario.id, "fr:content", v || null)}
                  onRevert={() => revertField(editingScenario.id, "fr:content")}
                  onGenerate={() => generateFrField(editingScenario.id, "content", getEffective(editingHardcoded, "content") ?? "")}
                  multiline
                  t={t}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg">{t("adminScenarios.title")}</h2>
          <Badge variant="outline" className="text-xs">
            {t("adminScenarios.scenariosCount").replace("{count}", String(hardcodedScenarios.length))}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadAndClear} className="gap-1">
            <Download className="h-3.5 w-3.5" /> {t("adminScenarios.downloadJsonClearDb")}
          </Button>
        </div>
      </div>

      {/* Override banner */}
      {overriddenCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300" dangerouslySetInnerHTML={{
            __html: t("adminScenarios.overrideBanner").replace("{count}", String(overriddenCount))
          }} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1">
          <p className="text-xs text-muted-foreground italic px-3 pb-1">{t("adminScenarios.teaserHint")}</p>
          {mergedScenarios.map((scenario) => {
            const scenarioHasOverrides = overrides.has(scenario.id) && (overrides.get(scenario.id)?.size ?? 0) > 0;

            return (
              <div key={scenario.id} className="rounded-md hover:bg-muted/50">
                <button
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm"
                  onClick={() => setExpandedId(scenario.id)}
                >
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90 shrink-0" />
                  <span className="font-medium flex-1">{scenario.title}</span>
                  {scenarioHasOverrides && <Badge variant="secondary" className="text-[10px]">{t("adminScenarios.modified")}</Badge>}
                  {scenario.level != null && (
                    <Badge variant="secondary" className="text-xs">{t("adminScenarios.lvl").replace("{level}", String(scenario.level))}</Badge>
                  )}
                </button>
                {scenario.teaser && (
                  <div className="flex items-start gap-1.5 px-3 pb-2 pl-9">
                    <p className="text-xs text-muted-foreground italic flex-1 line-clamp-2">{scenario.teaser}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(scenario.teaser!);
                        toast({ title: t("adminScenarios.copied") });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Full content editor with integrated insert toolbar and cursor-aware insertion */
const ContentEditor = ({
  scenarioId, scenarioTitle, scenarioTeaser,
  value, isOverridden, saving, onSave, onRevert, fullScreen, t
}: {
  scenarioId: string;
  scenarioTitle: string;
  scenarioTeaser: string | null;
  value: string;
  isOverridden: boolean;
  saving: boolean;
  onSave: (v: string) => void;
  onRevert: () => void;
  fullScreen?: boolean;
  t: (k: string) => string;
}) => {
  const [local, setLocal] = useState(value);
  const dirty = local !== value;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cursorPosRef = useRef<number>(0);
  const [bgDialogOpen, setBgDialogOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  useEffect(() => { setLocal(value); }, [value]);

  const handleSelect = () => {
    if (textareaRef.current) {
      cursorPosRef.current = textareaRef.current.selectionStart;
    }
  };

  const insertAtCursor = useCallback((text: string) => {
    const pos = textareaRef.current?.selectionStart ?? cursorPosRef.current;
    setLocal(prev => {
      const before = prev.slice(0, pos);
      const after = prev.slice(pos);
      return before + text + after;
    });
    const newPos = pos + text.length;
    cursorPosRef.current = newPos;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
      }
    });
  }, []);

  const handleBgInsert = useCallback((url: string) => {
    const tag = `<!--@ background_image: ${url.trim()} @-->\n`;
    insertAtCursor(tag);
  }, [insertAtCursor]);

  return (
    <div className={`space-y-1.5 ${fullScreen ? "flex-1 flex flex-col min-h-0" : ""}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm flex items-center gap-1.5">
          {t("adminScenarios.fieldContent")}
          {isOverridden && (
            <button
              onClick={onRevert}
              className="text-amber-600 dark:text-amber-400 hover:underline text-[10px]"
              title={t("adminScenarios.dbOverrideRevert")}
            >
              ● {t("adminScenarios.revert")}
            </button>
          )}
        </Label>
      </div>

      {/* Insert Tag toolbar */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-sm gap-1"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Plus className="h-3 w-3" />
              {t("adminScenarios.insertTag")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setBgDialogOpen(true)}
            >
              <Image className="h-4 w-4 mr-2" />
              {t("adminScenarios.insertTagBg")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertAtCursor("\n{{Ambiance Track\n| 5min = \n| 15min = \n| 30min = \n}}\n")}
            >
              <Timer className="h-4 w-4 mr-2" />
              {t("adminScenarios.insertTagAmbiance")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertAtCursor("\n====\n")}
            >
              <SeparatorHorizontal className="h-4 w-4 mr-2" />
              {t("adminScenarios.insertSectionBreak") || "Section Break"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                const url = prompt(t("adminScenarios.spotifyUrlPrompt"));
                if (!url) return;
                const resolved = await resolveSpotifyName(url);
                const name = resolved || url;
                if (resolved) {
                  toast({ title: `✓ ${resolved}` });
                } else {
                  toast({ title: t("adminScenarios.spotifyNameFallback") || "Could not resolve name — using URL", variant: "destructive" });
                }
                insertAtCursor(`<!--@ playlist: ${url.trim()} | ${name} @-->\n`);
              }}
            >
              <ListMusic className="h-4 w-4 mr-2" />
              {t("adminScenarios.insertTagPlaylist")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                const url = prompt(t("adminScenarios.spotifyUrlPrompt"));
                if (!url) return;
                const resolved = await resolveSpotifyName(url);
                const name = resolved || url;
                if (resolved) {
                  toast({ title: `✓ ${resolved}` });
                } else {
                  toast({ title: t("adminScenarios.spotifyNameFallback") || "Could not resolve name — using URL", variant: "destructive" });
                }
                insertAtCursor(`<!--@ queue_track: ${url.trim()} | ${name} @-->\n`);
              }}
            >
              <Music className="h-4 w-4 mr-2" />
              {t("adminScenarios.insertTagQueueTrack")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-sm gap-1"
          onClick={() => setAiPanelOpen(true)}
        >
          <Sparkles className="h-3 w-3" />
          {t("adminScenarios.improveWithAi")}
        </Button>
      </div>

      {/* Textarea + save button */}
      <div className={`flex gap-1.5 ${fullScreen ? "flex-1 min-h-0" : ""}`}>
        <Textarea
          ref={textareaRef}
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
            cursorPosRef.current = e.target.selectionStart;
          }}
          onSelect={handleSelect}
          onClick={handleSelect}
          onKeyUp={handleSelect}
          className={`font-mono text-sm flex-1 ${fullScreen ? "h-full resize-none" : "min-h-[200px]"}`}
        />
        {dirty && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 shrink-0 self-start"
            disabled={saving}
            onClick={() => onSave(local)}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
        )}
      </div>

      <BackgroundInsertDialog
        open={bgDialogOpen}
        onOpenChange={setBgDialogOpen}
        onInsert={handleBgInsert}
        scenarioId={scenarioId}
        scenarioTitle={scenarioTitle}
        scenarioTeaser={scenarioTeaser}
      />
    </div>
  );
};

/** Reusable field with override indicator and save/revert */
const OverrideField = ({
  label, value, isOverridden, saving, onSave, onRevert, type, multiline, inline, t
}: {
  label: string;
  value: any;
  isOverridden: boolean;
  saving: boolean;
  onSave: (v: string) => void;
  onRevert: () => void;
  type?: string;
  multiline?: boolean;
  inline?: boolean;
  t: (k: string) => string;
}) => {
  const [local, setLocal] = useState(String(value ?? ""));
  const dirty = local !== String(value ?? "");

  useEffect(() => { setLocal(String(value ?? "")); }, [value]);

  return (
    <div className={inline ? "flex items-center gap-1.5" : "space-y-1"}>
      {!inline && (
        <Label className="text-sm flex items-center gap-1.5">
          {label}
          {isOverridden && (
            <button
              onClick={onRevert}
              className="text-amber-600 dark:text-amber-400 hover:underline text-[10px]"
              title={t("adminScenarios.dbOverrideRevert")}
            >
              ● {t("adminScenarios.revert")}
            </button>
          )}
        </Label>
      )}
      <div className="flex gap-1.5">
        {multiline ? (
          <Textarea
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="text-sm min-h-[60px] flex-1"
          />
        ) : (
          <Input
            type={type}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-8 text-sm flex-1"
          />
        )}
        {dirty && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 shrink-0"
            disabled={saving}
            onClick={() => onSave(local)}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
};

/** Translation field with AI generate button */
const TranslationField = ({
  label, value, isOverridden, saving, generating, onSave, onRevert, onGenerate, multiline, t
}: {
  label: string;
  value: string;
  isOverridden: boolean;
  saving: boolean;
  generating?: boolean;
  onSave: (v: string) => void;
  onRevert: () => void;
  onGenerate?: () => void;
  multiline?: boolean;
  t: (k: string) => string;
}) => {
  const [local, setLocal] = useState(value);
  const dirty = local !== value;

  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {onGenerate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            disabled={generating}
            onClick={onGenerate}
            title={t("adminEditor.generateTranslation")}
          >
            {generating
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3 text-primary" />
            }
          </Button>
        )}
        {isOverridden && (
          <button
            onClick={onRevert}
            className="text-amber-600 dark:text-amber-400 hover:underline text-[10px]"
            title={t("adminScenarios.dbOverrideRevert")}
          >
            ● {t("adminScenarios.revert")}
          </button>
        )}
      </div>
      <div className="flex gap-1.5">
        {multiline ? (
          <Textarea
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="text-sm min-h-[60px] flex-1 border-primary/20"
            placeholder={t("adminEditor.noTranslation")}
          />
        ) : (
          <Input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-8 text-sm flex-1 border-primary/20"
            placeholder={t("adminEditor.noTranslation")}
          />
        )}
        {dirty && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 shrink-0"
            disabled={saving}
            onClick={() => onSave(local)}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScenarioEditorPanel;
