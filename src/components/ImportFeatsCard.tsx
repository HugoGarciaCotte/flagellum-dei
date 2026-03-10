import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Upload } from "lucide-react";

const ImportFeatsCard = () => {
  return (
    <Card className="border-primary/20 opacity-60">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" /> Import Feats from Wiki
        </CardTitle>
        <CardDescription>
          Feats are now hardcoded in the source code and ship with the app bundle.
          Wiki import/export is disabled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled className="gap-2 font-display">
          <Search className="h-4 w-4" /> Check for Updates
        </Button>
      </CardContent>
    </Card>
  );
};

export default ImportFeatsCard;
