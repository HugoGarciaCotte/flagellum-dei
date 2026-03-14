import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, ChevronDown, AlertTriangle, Check, Image, Loader2, Plus, Music } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BackgroundInsertDialog from "@/components/BackgroundInsertDialog";
import { getHardcodedScenarios, type Scenario } from "@/data/scenarios";
import { downloadFile } from "@/lib/downloadFile";
import { extractImageUrls } from "@/lib/parseWikitext";
import { toast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { invalidateScenarioOverrides, type ScenarioOverrideMap } from "@/lib/scenarioOverrides";

const SCENARIO_FIELDS = ["title", "description", "level", "content"] as const;

const ScenarioEditorPanel = () => {
  const { t } = useTranslation();
  const [hardcodedScenarios] = useState<Scenario[]>(() => getHardcodedScenarios().map(s => ({ ...s })));
  const [overrides, setOverrides] = useState<ScenarioOverrideMap>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

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
          // Derive a clean filename from the URL path
          const urlPath = new URL(url).pathname;
          const segments = urlPath.split("/");
          // Keep last 2 segments for uniqueness (e.g. scenarioId/filename.png)
          const localPath = `scenario-backgrounds/${segments.slice(-2).join("/")}`;
          urlMap.set(url, `/${localPath}`);
          imageBlobs.set(localPath, blob);
        } catch (e) {
          console.warn(`Failed to download image: ${url}`, e);
          // Leave URL as-is if download fails
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

    // 4. Generate scenarios.ts
    const lines: string[] = [
      "// Auto-generated from admin editor",
      `// Generated on ${new Date().toISOString()}`,
      "",
      'import { getCachedScenarioOverrides, applyScenarioOverrides } from "@/lib/scenarioOverrides";',
      "",
      "export interface Scenario {",
      "  id: string;",
      "  title: string;",
      "  description: string | null;",
      "  level: number | null;",
      "  content: string | null;",
      "}",
      "",
    ];

    rewrittenScenarios.forEach((s, i) => {
      const varName = `scenario${i + 1}`;
      lines.push(`export const ${varName}: Scenario = {`);
      lines.push(`  id: ${JSON.stringify(s.id)},`);
      lines.push(`  title: ${JSON.stringify(s.title)},`);
      lines.push(`  description: ${s.description ? JSON.stringify(s.description) : "null"},`);
      lines.push(`  level: ${s.level ?? "null"},`);
      lines.push(`  content: ${s.content ? JSON.stringify(s.content) : "null"},`);
      lines.push("};");
      lines.push("");
    });

    const varNames = rewrittenScenarios.map((_, i) => `scenario${i + 1}`);
    lines.push(`const hardcodedScenarios: Scenario[] = [${varNames.join(", ")}];`);
    lines.push("");
    lines.push("/** Returns all scenarios, with DB overrides applied if loaded. */");
    lines.push("export function getAllScenarios(): Scenario[] {");
    lines.push("  const overrides = getCachedScenarioOverrides();");
    lines.push("  if (!overrides || overrides.size === 0) return hardcodedScenarios;");
    lines.push("  return hardcodedScenarios.map(s => applyScenarioOverrides(s, overrides));");
    lines.push("}");
    lines.push("");
    lines.push("/** Returns the raw hardcoded scenarios without any overrides. */");
    lines.push("export function getHardcodedScenarios(): Scenario[] {");
    lines.push("  return hardcodedScenarios;");
    lines.push("}");
    lines.push("");
    lines.push("export function getScenarioById(id: string): Scenario | undefined {");
    lines.push("  const overrides = getCachedScenarioOverrides();");
    lines.push("  const scenario = hardcodedScenarios.find(s => s.id === id);");
    lines.push("  if (!scenario) return undefined;");
    lines.push("  return overrides ? applyScenarioOverrides(scenario, overrides) : scenario;");
    lines.push("}");

    // 5. Build ZIP if there are images, otherwise just download .ts
    if (imageBlobs.size > 0) {
      const zip = new JSZip();
      zip.file("scenarios.ts", lines.join("\n"));

      for (const [path, blob] of imageBlobs) {
        zip.file(path, blob);
      }

      // 6. Add README with Lovable prompt
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

  return (
    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
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
          {mergedScenarios.map((scenario) => {
            const hardcoded = hardcodedScenarios.find(s => s.id === scenario.id)!;
            const scenarioHasOverrides = overrides.has(scenario.id) && (overrides.get(scenario.id)?.size ?? 0) > 0;

            return (
              <Collapsible
                key={scenario.id}
                open={expandedId === scenario.id}
                onOpenChange={(open) => setExpandedId(open ? scenario.id : null)}
              >
                <CollapsibleTrigger className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedId === scenario.id ? "rotate-0" : "-rotate-90"}`} />
                  <span className="font-medium flex-1">{scenario.title}</span>
                  {scenarioHasOverrides && <Badge variant="secondary" className="text-[10px]">{t("adminScenarios.modified")}</Badge>}
                  {scenario.level != null && (
                    <Badge variant="secondary" className="text-xs">{t("adminScenarios.lvl").replace("{level}", String(scenario.level))}</Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 pt-1">
                  <div className="space-y-3 border border-border rounded-md p-3 bg-muted/20">
                    {/* Title */}
                    <OverrideField
                      label={t("adminScenarios.fieldTitle")}
                      value={getEffective(hardcoded, "title") ?? ""}
                      isOverridden={isOverridden(scenario.id, "title")}
                      saving={savingFields.has(`${scenario.id}:title`)}
                      onSave={(v) => saveField(scenario.id, "title", v)}
                      onRevert={() => revertField(scenario.id, "title")}
                      t={t}
                    />

                    {/* Level */}
                    <OverrideField
                      label={t("adminScenarios.fieldLevel")}
                      value={getEffective(hardcoded, "level") ?? ""}
                      isOverridden={isOverridden(scenario.id, "level")}
                      saving={savingFields.has(`${scenario.id}:level`)}
                      onSave={(v) => saveField(scenario.id, "level", v === "" ? null : parseInt(v))}
                      onRevert={() => revertField(scenario.id, "level")}
                      type="number"
                      t={t}
                    />

                    {/* Description */}
                    <OverrideField
                      label={t("adminScenarios.fieldDescription")}
                      value={getEffective(hardcoded, "description") ?? ""}
                      isOverridden={isOverridden(scenario.id, "description")}
                      saving={savingFields.has(`${scenario.id}:description`)}
                      onSave={(v) => saveField(scenario.id, "description", v || null)}
                      onRevert={() => revertField(scenario.id, "description")}
                      multiline
                      t={t}
                    />

                    {/* Content — full editor with integrated toolbar */}
                    <ContentEditor
                      scenarioId={scenario.id}
                      scenarioTitle={scenario.title}
                      scenarioDescription={scenario.description}
                      value={getEffective(hardcoded, "content") ?? ""}
                      isOverridden={isOverridden(scenario.id, "content")}
                      saving={savingFields.has(`${scenario.id}:content`)}
                      onSave={(v) => saveField(scenario.id, "content", v || null)}
                      onRevert={() => revertField(scenario.id, "content")}
                      t={t}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Full content editor with integrated insert toolbar and cursor-aware insertion */
const ContentEditor = ({
  scenarioId, scenarioTitle, scenarioDescription,
  value, isOverridden, saving, onSave, onRevert, t
}: {
  scenarioId: string;
  scenarioTitle: string;
  scenarioDescription: string | null;
  value: string;
  isOverridden: boolean;
  saving: boolean;
  onSave: (v: string) => void;
  onRevert: () => void;
  t: (k: string) => string;
}) => {
  const [local, setLocal] = useState(value);
  const dirty = local !== value;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cursorPosRef = useRef<number>(0);
  const [bgDialogOpen, setBgDialogOpen] = useState(false);

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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5">
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
              className="h-7 text-xs gap-1"
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
            <DropdownMenuItem disabled>
              <Music className="h-4 w-4 mr-2" />
              {t("adminScenarios.insertTagMusic")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Textarea + save button */}
      <div className="flex gap-1.5">
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
          className="text-sm min-h-[200px] font-mono text-xs flex-1"
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
        scenarioDescription={scenarioDescription}
      />
    </div>
  );
};

/** Reusable field with override indicator and save/revert */
const OverrideField = ({
  label, value, isOverridden, saving, onSave, onRevert, type, multiline, t
}: {
  label: string;
  value: any;
  isOverridden: boolean;
  saving: boolean;
  onSave: (v: string) => void;
  onRevert: () => void;
  type?: string;
  multiline?: boolean;
  t: (k: string) => string;
}) => {
  const [local, setLocal] = useState(String(value ?? ""));
  const dirty = local !== String(value ?? "");

  useEffect(() => { setLocal(String(value ?? "")); }, [value]);

  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1.5">
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

export default ScenarioEditorPanel;
