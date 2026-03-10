import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FileText } from "lucide-react";
import { getAllScenarios } from "@/data/scenarios";

const ManageScenarios = () => {
  const scenarios = getAllScenarios();

  return (
    <Card className="border-primary/20 opacity-60">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" /> Manage Scenarios
        </CardTitle>
        <CardDescription className="mt-1.5">
          Scenarios are now hardcoded in the source code. Edit them directly in{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">src/data/scenarios.ts</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!scenarios.length ? (
          <p className="text-sm text-muted-foreground py-4">No scenarios.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Level</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
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
