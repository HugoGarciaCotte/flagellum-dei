import { useTranslation } from "@/i18n/useTranslation";

interface FullPageLoaderProps {
  message?: string;
}

const FullPageLoader = ({ message }: FullPageLoaderProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" style={{ background: "radial-gradient(ellipse at center, hsl(43 74% 49% / 0.04) 0%, hsl(0 0% 7%) 70%)" }}>
      <div className="text-center space-y-4">
        <div className="animate-pulse-glow text-primary font-display text-xl">{message ?? t("common.loading")}</div>
        <div className="ornamental-divider w-32 mx-auto" />
      </div>
    </div>
  );
};

export default FullPageLoader;
