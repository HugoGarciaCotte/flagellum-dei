import { ReactNode, useState, MouseEvent } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/useTranslation";

interface PortraitViewerProps {
  src?: string | null;
  alt: string;
  fileName?: string;
  children: ReactNode;
  className?: string;
}

const sanitize = (s: string) => s.replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "portrait";

const PortraitViewer = ({ src, alt, fileName, children, className }: PortraitViewerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!src) {
    return <>{children}</>;
  }

  const handleTriggerClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(true);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(src, { mode: "cors" });
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitize(fileName || alt)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(src, "_blank", "noopener,noreferrer");
      toast({ title: t("portrait.downloadFailed") });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTriggerClick}
        className={`cursor-zoom-in rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className ?? ""}`}
        aria-label={t("portrait.view")}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl p-4 bg-card border-primary/30 gold-glow-box"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle className="font-display text-base text-foreground">{alt}</DialogTitle>
          <div className="flex items-center justify-center bg-black/40 rounded-md overflow-hidden">
            <img
              src={src}
              alt={alt}
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">{t("portrait.dismiss")}</Button>
            </DialogClose>
            <Button size="sm" onClick={handleDownload}>{t("portrait.download")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PortraitViewer;
