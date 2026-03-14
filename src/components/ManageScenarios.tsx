import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FileText } from "lucide-react";
import { getAllScenarios } from "@/data/scenarios";
import { useTranslation } from "@/i18n/useTranslation";

const ManageScenarios = () => {
  const scenarios = getAllScenarios();
  const { t } = useTranslation();

  return (
    <Card className="border-primary/20 opacity-60">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" /> {t("adminLegacy.manageScenarios")}
        </CardTitle>
        <CardDescription className="mt-1.5" dangerouslySetInnerHTML={{ __html: t("adminLegacy.manageScenariosDesc") }} />
      </CardHeader>
      <CardContent>
        {!scenarios.length ? (
          <p className="text-sm text-muted-foreground py-4">{t("adminLegacy.noScenarios")}</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("adminLegacy.tableTitle")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("adminLegacy.tableLevel")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("adminLegacy.tableDescription")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {s.level ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-[300px]">
                      {s.description || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManageScenarios;
