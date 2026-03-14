import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "@/i18n/useTranslation";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="font-display text-6xl font-bold text-primary">404</h1>
        <div className="ornamental-divider w-48 mx-auto" />
        <p className="font-display text-xl text-foreground">{t("notFound.title")}</p>
        <p className="text-muted-foreground">{t("notFound.description")}</p>
        <a href="/" className="inline-block font-display text-primary underline hover:text-primary/90">
          {t("notFound.returnHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
