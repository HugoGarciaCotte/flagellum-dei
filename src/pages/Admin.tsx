import { useNavigate } from "react-router-dom";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, FileText, Swords, Archive, ChevronDown, Languages } from "lucide-react";
import ManageScenarios from "@/components/ManageScenarios";
import ImportFeatsCard from "@/components/ImportFeatsCard";
import ManageRedirects from "@/components/ManageRedirects";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";
import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";

const Admin = () => {
  const navigate = useNavigate();
  const { isOwner, isLoading: roleLoading } = useIsOwner();
  const [legacyOpen, setLegacyOpen] = useState(false);
  const { t } = useTranslation();

  if (roleLoading) return <FullPageLoader />;

  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">{t("admin.accessDenied")}</p>
        <Button onClick={() => navigate("/")} variant="outline">{t("admin.returnHome")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t("admin.title")}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <main className="container py-8 max-w-5xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-primary/30 cursor-pointer hover:border-primary/60 transition-colors" onClick={() => navigate("/admin/scenarios")}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> {t("admin.scenarios")}
              </CardTitle>
              <CardDescription>{t("admin.scenariosDesc")}</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/30 cursor-pointer hover:border-primary/60 transition-colors" onClick={() => navigate("/admin/feats")}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Swords className="h-5 w-5 text-primary" /> {t("admin.feats")}
              </CardTitle>
              <CardDescription>{t("admin.featsDesc")}</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/30 cursor-pointer hover:border-primary/60 transition-colors" onClick={() => navigate("/admin/translations")}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary" /> {t("admin.translations")}
              </CardTitle>
              <CardDescription>{t("admin.translationsDesc")}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Collapsible open={legacyOpen} onOpenChange={setLegacyOpen}>
          <CollapsibleTrigger className="w-full text-left px-4 py-3 rounded-md border border-border hover:bg-muted/50 flex items-center gap-2 text-sm text-muted-foreground">
            <Archive className="h-4 w-4" />
            <span className="flex-1 font-display">{t("admin.legacyImport")}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${legacyOpen ? "rotate-0" : "-rotate-90"}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-6">
            <ManageScenarios />
            <ImportFeatsCard />
            <ManageRedirects />
          </CollapsibleContent>
        </Collapsible>
      </main>
    </div>
  );
};

export default Admin;
