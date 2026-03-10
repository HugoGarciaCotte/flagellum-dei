import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Plus, Trash2, ChevronDown } from "lucide-react";
import { getAllScenarios, type Scenario } from "@/data/scenarios";
import { downloadFile } from "@/lib/downloadFile";
import { toast } from "@/hooks/use-toast";

const ScenarioEditorPanel = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>(() =>
    getAllScenarios().map(s => ({ ...s }))
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateScenario = (id: string, patch: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const addScenario = () => {
    const newId = crypto.randomUUID();
    setScenarios(prev => [...prev, {
      id: newId,
      title: "New Scenario",
      description: null,
      level: null,
      content: null,
    }]);
    setExpandedId(newId);
  };

  const deleteScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const generateTsFile = (): string => {
    const lines: string[] = [
      "// Auto-generated from admin editor",
      `// Generated on ${new Date().toISOString()}`,
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

    scenarios.forEach((s, i) => {
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

    const varNames = scenarios.map((_, i) => `scenario${i + 1}`);
    lines.push(`export const scenarios: Scenario[] = [${varNames.join(", ")}];`);
    lines.push("");
    lines.push("export function getAllScenarios(): Scenario[] {");
    lines.push("  return scenarios;");
    lines.push("}");
    lines.push("");
    lines.push("export function getScenarioById(id: string): Scenario | undefined {");
    lines.push("  return scenarios.find(s => s.id === id);");
    lines.push("}");

    return lines.join("\n");
  };

  const handleDownload = () => {
    downloadFile("scenarios.ts", generateTsFile(), "text/typescript");
    toast({ title: "Downloaded", description: "scenarios.ts file downloaded. Replace src/data/scenarios.ts with it." });
  };

  return (
    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg">Scenarios</h2>
          <Badge variant="outline" className="text-xs">{scenarios.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addScenario} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-1">
            <Download className="h-3.5 w-3.5" /> Download scenarios.ts
          </Button>
        </div>
      </div>

      <div className="space-y-1 overflow-y-auto flex-1">
        {scenarios.map((scenario) => (
          <Collapsible
            key={scenario.id}
            open={expandedId === scenario.id}
            onOpenChange={(open) => setExpandedId(open ? scenario.id : null)}
          >
            <CollapsibleTrigger className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedId === scenario.id ? "rotate-0" : "-rotate-90"}`} />
              <span className="font-medium flex-1">{scenario.title}</span>
              {scenario.level != null && (
                <Badge variant="secondary" className="text-xs">Lvl {scenario.level}</Badge>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 pt-1">
              <div className="space-y-3 border border-border rounded-md p-3 bg-muted/20">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={scenario.title}
                      onChange={(e) => updateScenario(scenario.id, { title: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Level</Label>
                    <Input
                      type="number"
                      value={scenario.level ?? ""}
                      onChange={(e) => updateScenario(scenario.id, { level: e.target.value ? parseInt(e.target.value) : null })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={scenario.description ?? ""}
                    onChange={(e) => updateScenario(scenario.id, { description: e.target.value || null })}
                    className="text-sm min-h-[60px]"
                  />
                </div>
                <div>
                  <Label className="text-xs">Content (wikitext)</Label>
                  <Textarea
                    value={scenario.content ?? ""}
                    onChange={(e) => updateScenario(scenario.id, { content: e.target.value || null })}
                    className="text-sm min-h-[200px] font-mono text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" onClick={() => deleteScenario(scenario.id)} className="gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default ScenarioEditorPanel;
