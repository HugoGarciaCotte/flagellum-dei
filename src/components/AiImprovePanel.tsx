import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Check, X, RotateCcw, Plus, Image, Timer, SeparatorHorizontal, ListMusic, Music } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/* ─── Diff types ─── */
type DiffLineKind = "equal" | "added" | "removed" | "modified";
interface DiffLine {
  kind: DiffLineKind;
  oldLine?: string;
  newLine?: string;
  accepted: boolean | null; // null = pending, true = accepted, false = rejected
}

/* ─── Word-level diff for modified lines ─── */
interface WordSpan { kind: "equal" | "added" | "removed"; text: string }

function computeWordDiff(oldLine: string, newLine: string): { oldSpans: WordSpan[]; newSpans: WordSpan[] } {
  const oldWords = oldLine.split(/(\s+)/);
  const newWords = newLine.split(/(\s+)/);
  const m = oldWords.length, n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldWords[i-1] === newWords[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const oldSpans: WordSpan[] = [];
  const newSpans: WordSpan[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i-1] === newWords[j-1]) {
      oldSpans.unshift({ kind: "equal", text: oldWords[i-1] });
      newSpans.unshift({ kind: "equal", text: newWords[j-1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      newSpans.unshift({ kind: "added", text: newWords[j-1] });
      j--;
    } else {
      oldSpans.unshift({ kind: "removed", text: oldWords[i-1] });
      i--;
    }
  }
  return { oldSpans, newSpans };
}

/* ─── Simple LCS-based line diff ─── */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const raw: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      raw.unshift({ kind: "equal", oldLine: oldLines[i - 1], newLine: newLines[j - 1], accepted: null });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ kind: "added", newLine: newLines[j - 1], accepted: null });
      j--;
    } else {
      raw.unshift({ kind: "removed", oldLine: oldLines[i - 1], accepted: null });
      i--;
    }
  }

  // Merge consecutive removed→added pairs into "modified" hunks
  const result: DiffLine[] = [];
  for (let k = 0; k < raw.length; k++) {
    if (raw[k].kind === "removed" && k + 1 < raw.length && raw[k + 1].kind === "added") {
      result.push({ kind: "modified", oldLine: raw[k].oldLine, newLine: raw[k + 1].newLine, accepted: null });
      k++; // skip the added line
    } else {
      result.push(raw[k]);
    }
  }
  return result;
}

/* ─── Panel props ─── */
interface AiImprovePanelProps {
  content: string;
  onApply: (newContent: string) => void;
  onClose: () => void;
  insertAtCursor?: (text: string) => void;
  t: (k: string) => string;
}

export default function AiImprovePanel({ content, onApply, onClose, t }: AiImprovePanelProps) {
  const [instruction, setInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [diff, setDiff] = useState<DiffLine[] | null>(null);
  const [improvedRaw, setImprovedRaw] = useState("");
  const instructionRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef(0);

  // Focus instruction on mount
  useEffect(() => { instructionRef.current?.focus(); }, []);

  const handleGenerate = useCallback(async () => {
    if (!instruction.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-scenario-content", {
        body: { content, instruction: instruction.trim() },
      });
      if (error) throw error;
      if (data?.improved_content) {
        setImprovedRaw(data.improved_content);
        setDiff(computeDiff(content, data.improved_content));
      }
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      toast({ title: t("adminScenarios.improveError"), description: msg, variant: "destructive" });
    }
    setGenerating(false);
  }, [content, instruction, t]);

  const changedCount = useMemo(() => diff?.filter(d => d.kind !== "equal").length ?? 0, [diff]);
  const pendingCount = useMemo(() => diff?.filter(d => d.kind !== "equal" && d.accepted === null).length ?? 0, [diff]);

  const setLineDecision = useCallback((idx: number, accepted: boolean) => {
    setDiff(prev => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], accepted };
      return next;
    });
  }, []);

  const acceptAll = useCallback(() => {
    setDiff(prev => prev?.map(d => d.kind !== "equal" ? { ...d, accepted: true } : d) ?? null);
  }, []);

  const rejectAll = useCallback(() => {
    setDiff(prev => prev?.map(d => d.kind !== "equal" ? { ...d, accepted: false } : d) ?? null);
  }, []);

  const handleApply = useCallback(() => {
    if (!diff) return;
    const lines: string[] = [];
    for (const d of diff) {
      if (d.kind === "equal") {
        lines.push(d.oldLine!);
      } else if (d.kind === "added") {
        if (d.accepted === true) lines.push(d.newLine!);
        // rejected or pending additions are skipped
      } else if (d.kind === "removed") {
        if (d.accepted !== true) lines.push(d.oldLine!);
        // accepted removals are skipped (line removed)
      }
    }
    onApply(lines.join("\n"));
  }, [diff, onApply]);

  const insertTag = useCallback((text: string) => {
    const pos = instructionRef.current?.selectionStart ?? cursorRef.current;
    setInstruction(prev => prev.slice(0, pos) + text + prev.slice(pos));
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <h3 className="font-display text-sm font-semibold flex-1">{t("adminScenarios.improveWithAi")}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Instruction input */}
      {!diff && (
        <div className="px-4 py-3 space-y-2 border-b border-border">
          <Textarea
            ref={instructionRef}
            value={instruction}
            onChange={(e) => { setInstruction(e.target.value); cursorRef.current = e.target.selectionStart; }}
            onSelect={() => { if (instructionRef.current) cursorRef.current = instructionRef.current.selectionStart; }}
            placeholder={t("adminScenarios.improvePlaceholder")}
            className="text-sm min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onMouseDown={e => e.preventDefault()}>
                  <Plus className="h-3 w-3" /> {t("adminScenarios.insertTag")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onMouseDown={e => e.preventDefault()} onClick={() => insertTag('<!--@ background_image: URL @-->')}>
                  <Image className="h-4 w-4 mr-2" /> {t("adminScenarios.insertTagBg")}
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={e => e.preventDefault()} onClick={() => insertTag('{{Ambiance Track\n| 5min = \n| 15min = \n}}')}>
                  <Timer className="h-4 w-4 mr-2" /> {t("adminScenarios.insertTagAmbiance")}
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={e => e.preventDefault()} onClick={() => insertTag('====')}>
                  <SeparatorHorizontal className="h-4 w-4 mr-2" /> {t("adminScenarios.insertSectionBreak")}
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={e => e.preventDefault()} onClick={() => insertTag('<!--@ playlist: URL | Name @-->')}>
                  <ListMusic className="h-4 w-4 mr-2" /> {t("adminScenarios.insertTagPlaylist")}
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={e => e.preventDefault()} onClick={() => insertTag('<!--@ queue_track: URL | Name @-->')}>
                  <Music className="h-4 w-4 mr-2" /> {t("adminScenarios.insertTagQueueTrack")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex-1" />
            <Button size="sm" className="gap-1" disabled={generating || !instruction.trim()} onClick={handleGenerate}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? t("adminScenarios.improving") : t("adminScenarios.improve")}
            </Button>
          </div>
        </div>
      )}

      {/* Generating spinner */}
      {generating && !diff && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("adminScenarios.improving")}…</p>
          </div>
        </div>
      )}

      {/* Diff view */}
      {diff && (
        <>
          {/* Diff toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border text-xs">
            <span className="text-muted-foreground">
              {t("adminScenarios.diffChanges").replace("{count}", String(changedCount))}
              {pendingCount > 0 && ` · ${pendingCount} ${t("adminScenarios.diffPending")}`}
            </span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={acceptAll}>
              <Check className="h-3 w-3" /> {t("adminScenarios.diffAcceptAll")}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={rejectAll}>
              <X className="h-3 w-3" /> {t("adminScenarios.diffRejectAll")}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setDiff(null)}>
              <RotateCcw className="h-3 w-3" /> {t("adminScenarios.diffNewPrompt")}
            </Button>
          </div>

          {/* Side-by-side diff content */}
          <div className="flex-1 overflow-auto min-h-0">
            <div className="min-w-[700px]">
              {/* Column headers */}
              <div className="flex sticky top-0 bg-background z-10 border-b border-border text-xs font-medium text-muted-foreground">
                <div className="w-1/2 px-3 py-1.5">{t("adminScenarios.diffOriginal")}</div>
                <div className="w-1/2 px-3 py-1.5">{t("adminScenarios.diffProposed")}</div>
              </div>
              {diff.map((d, idx) => (
                <DiffRow key={idx} line={d} idx={idx} onDecide={setLineDecision} />
              ))}
            </div>
          </div>

          {/* Apply bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("adminScenarios.diffCancel")}
            </Button>
            <div className="flex-1" />
            <Button size="sm" className="gap-1" onClick={handleApply}>
              <Check className="h-3.5 w-3.5" /> {t("adminScenarios.diffApply")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Word span renderer ─── */
function WordSpans({ spans, side }: { spans: WordSpan[]; side: "old" | "new" }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.kind === "equal") return <span key={i}>{s.text}</span>;
        if (side === "old" && s.kind === "removed")
          return <span key={i} className="bg-destructive/25 line-through">{s.text}</span>;
        if (side === "new" && s.kind === "added")
          return <span key={i} className="bg-green-500/25">{s.text}</span>;
        return null;
      })}
    </>
  );
}

/* ─── Accept/Reject buttons ─── */
function DecisionButtons({ idx, isAccepted, isRejected, onDecide }: { idx: number; isAccepted: boolean; isRejected: boolean; onDecide: (i: number, v: boolean) => void }) {
  return (
    <div className="flex gap-0.5 shrink-0 mt-0.5">
      <button
        className={`p-0.5 rounded hover:bg-green-500/20 ${isAccepted ? "text-green-600" : "text-muted-foreground"}`}
        onClick={() => onDecide(idx, true)}
        title="Accept"
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        className={`p-0.5 rounded hover:bg-destructive/20 ${isRejected ? "text-destructive" : "text-muted-foreground"}`}
        onClick={() => onDecide(idx, false)}
        title="Reject"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ─── Diff row ─── */
function DiffRow({ line, idx, onDecide }: { line: DiffLine; idx: number; onDecide: (i: number, v: boolean) => void }) {
  if (line.kind === "equal") {
    return (
      <div className="flex text-xs font-mono border-b border-border/50">
        <div className="w-1/2 px-3 py-0.5 text-muted-foreground whitespace-pre-wrap break-all">{line.oldLine}</div>
        <div className="w-1/2 px-3 py-0.5 text-muted-foreground whitespace-pre-wrap break-all">{line.newLine}</div>
      </div>
    );
  }

  const isAccepted = line.accepted === true;
  const isRejected = line.accepted === false;
  const isPending = line.accepted === null;

  let rowBg = "";
  if (isPending) rowBg = "bg-amber-500/5";
  else if (isAccepted) rowBg = "bg-green-500/10";
  else rowBg = "bg-muted/30 opacity-50";

  if (line.kind === "modified") {
    const { oldSpans, newSpans } = computeWordDiff(line.oldLine ?? "", line.newLine ?? "");
    return (
      <div className={`flex text-xs font-mono border-b border-border/50 ${rowBg}`}>
        <div className="w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all">
          <WordSpans spans={oldSpans} side="old" />
        </div>
        <div className="w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all flex items-start gap-1">
          <span className="flex-1"><WordSpans spans={newSpans} side="new" /></span>
          <DecisionButtons idx={idx} isAccepted={isAccepted} isRejected={isRejected} onDecide={onDecide} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex text-xs font-mono border-b border-border/50 ${rowBg}`}>
      <div className="w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all">
        {line.kind === "removed" && (
          <span className="bg-destructive/20 text-destructive-foreground">{line.oldLine}</span>
        )}
        {line.kind === "added" && <span className="text-muted-foreground/30">—</span>}
      </div>
      <div className="w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all flex items-start gap-1">
        <span className="flex-1">
          {line.kind === "added" && (
            <span className="bg-green-500/20">{line.newLine}</span>
          )}
          {line.kind === "removed" && <span className="text-muted-foreground/30">—</span>}
        </span>
        <DecisionButtons idx={idx} isAccepted={isAccepted} isRejected={isRejected} onDecide={onDecide} />
      </div>
    </div>
  );
}
