import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Upload } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

const ImportFeatsCard = () => {
  const { t } = useTranslation();
  return (
    <Card className="border-primary/20 opacity-60">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" /> {t("adminLegacy.importFeats")}
        </CardTitle>
        <CardDescription>{t("adminLegacy.importFeatsDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled className="gap-2 font-display">
          <Search className="h-4 w-4" /> {t("adminLegacy.checkUpdates")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ImportFeatsCard;
