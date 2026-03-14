import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Link, Upload, Sparkles, Loader2, Check, X, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/useTranslation";

type BgMode = "link" | "upload" | "ai";

interface BackgroundInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string) => void;
  scenarioId: string;
  scenarioTitle: string;
  scenarioDescription: string | null;
}

const BackgroundInsertDialog = ({
  open, onOpenChange, onInsert,
  scenarioId, scenarioTitle, scenarioDescription,
}: BackgroundInsertDialogProps) => {
  const { t } = useTranslation();
  const [bgMode, setBgMode] = useState<BgMode>("link");
  const [bgUrl, setBgUrl] = useState("");
  const [bgPrompt, setBgPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bgRefFile, setBgRefFile] = useState<File | null>(null);
  const [bgRefPreview, setBgRefPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const refImageInputRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setBgUrl("");
    setBgPrompt("");
    setPreviewUrl(null);
    setBgRefFile(null);
    setBgRefPreview("");
    setGenerating(false);
    setUploading(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleInsert = (url: string) => {
    onInsert(url);
    reset();
    onOpenChange(false);
  };

  const handleLinkInsert = () => {
    if (!bgUrl.trim()) return;
    handleInsert(bgUrl.trim());
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `scenario-backgrounds/${scenarioId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);
      handleInsert(publicUrlData.publicUrl);
      toast({ title: "✓", description: "Image uploaded" });
    } catch (e: any) {
      toast({ title: t("adminScenarios.uploadFailed"), description: e.message, variant: "destructive" });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAiGenerate = async () => {
    setGenerating(true);
    setPreviewUrl(null);
    try {
      let referenceImageUrl: string | undefined;
      if (bgRefFile) {
        const ext = bgRefFile.name.split(".").pop() || "png";
        const refPath = `scenario-backgrounds/ref-${Date.now()}.${ext}`;
        const { error: refUploadError } = await supabase.storage
          .from("app-assets")
          .upload(refPath, bgRefFile, { contentType: bgRefFile.type, upsert: false });
        if (refUploadError) throw refUploadError;
        const { data: refUrlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(refPath);
        referenceImageUrl = refUrlData.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke("generate-scenario-background", {
        body: {
          scenarioId,
          scenarioTitle,
          scenarioDescription,
          prompt: bgPrompt.trim() || undefined,
          referenceImageUrl,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("No URL returned");

      setPreviewUrl(data.url);
    } catch (e: any) {
      toast({ title: t("adminScenarios.generateFailed"), description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Image className="h-4 w-4" />
            {t("adminScenarios.insertTagBg")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <ToggleGroup
            type="single"
            value={bgMode}
            onValueChange={(v) => { if (v) { setBgMode(v as BgMode); setPreviewUrl(null); } }}
            className="justify-start"
          >
            <ToggleGroupItem value="link" className="gap-1.5 text-xs">
              <Link className="h-3.5 w-3.5" /> {t("adminScenarios.bgModeLink")}
            </ToggleGroupItem>
            <ToggleGroupItem value="upload" className="gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" /> {t("adminScenarios.bgModeUpload")}
            </ToggleGroupItem>
            <ToggleGroupItem value="ai" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> {t("adminScenarios.bgModeAi")}
            </ToggleGroupItem>
          </ToggleGroup>

          {bgMode === "link" && (
            <div className="space-y-3">
              <Input
                value={bgUrl}
                onChange={(e) => setBgUrl(e.target.value)}
                placeholder={t("adminScenarios.backgroundUrl")}
                className="text-sm"
              />
              {bgUrl.trim() && (
                <div className="rounded-md border border-border overflow-hidden">
                  <img
                    src={bgUrl.trim()}
                    alt="Preview"
                    className="w-full h-40 object-cover bg-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <Button
                className="w-full gap-1.5"
                disabled={!bgUrl.trim()}
                onClick={handleLinkInsert}
              >
                <Check className="h-3.5 w-3.5" />
                {t("adminScenarios.insertBackground")}
              </Button>
            </div>
          )}

          {bgMode === "upload" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20 w-full"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {uploading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("adminScenarios.uploading")}
                </div>
              )}
            </div>
          )}

          {bgMode === "ai" && (
            <div className="space-y-3">
              <Input
                value={bgPrompt}
                onChange={(e) => setBgPrompt(e.target.value)}
                placeholder={t("adminScenarios.bgPromptPlaceholder")}
                className="text-sm"
                disabled={generating}
              />

              {/* Reference image */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {t("adminScenarios.bgRefImage")}
                  <input
                    ref={refImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={generating}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBgRefFile(file);
                        setBgRefPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
                {bgRefPreview && (
                  <div className="flex items-center gap-1.5">
                    <img
                      src={bgRefPreview}
                      alt="Reference"
                      className="h-8 w-8 rounded object-cover border border-border"
                    />
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={() => {
                        setBgRefFile(null);
                        setBgRefPreview("");
                        if (refImageInputRef.current) refImageInputRef.current.value = "";
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <Button
                className="w-full gap-1.5"
                disabled={generating}
                onClick={handleAiGenerate}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("adminScenarios.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("adminScenarios.bgModeAi")}
                  </>
                )}
              </Button>

              {/* Preview generated image */}
              {previewUrl && (
                <div className="space-y-2">
                  <div className="rounded-md border border-border overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Generated background"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-1.5"
                      onClick={() => handleInsert(previewUrl)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t("adminScenarios.insertBackground")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPreviewUrl(null)}
                      className="gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackgroundInsertDialog;
