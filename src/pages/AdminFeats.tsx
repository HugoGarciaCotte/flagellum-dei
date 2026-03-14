import { useNavigate } from "react-router-dom";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Swords } from "lucide-react";
import FeatEditorPanel from "@/components/FeatEditorPanel";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";
import { useTranslation } from "@/i18n/useTranslation";

const AdminFeats = () => {
  const navigate = useNavigate();
  const { isOwner, isLoading } = useIsOwner();
  const { t } = useTranslation();

  if (isLoading) return <FullPageLoader />;

  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">{t("admin.accessDenied")}</p>
        <Button onClick={() => navigate("/")} variant="outline">{t("admin.returnHome")}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        title={t("admin.feats")}
        icon={<Swords className="h-5 w-5 text-primary" />}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />
      <main className="container flex-1 overflow-hidden py-4 max-w-5xl flex flex-col">
        <FeatEditorPanel />
      </main>
    </div>
  );
};

export default AdminFeats;
