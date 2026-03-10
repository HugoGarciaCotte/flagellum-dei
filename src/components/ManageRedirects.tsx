import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";
import { getAllFeats, getAllFeatRedirects } from "@/data/feats";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { ArrowRight } from "lucide-react";

const WIKI_LINK_RE = /\[\[([^|\]]+?)(?:\|[^\]]+?)?\]\]/g;

function extractAllLinkTargets(feats: { content: string | null }[]): string[] {
  const targets = new Set<string>();
  for (const feat of feats) {
    if (!feat.content) continue;
    let match;
    const re = new RegExp(WIKI_LINK_RE.source, "g");
    while ((match = re.exec(feat.content)) !== null) {
      targets.add(match[1].trim());
    }
  }
  return Array.from(targets);
}

export default function ManageRedirects() {
  const feats = useMemo(() => getAllFeats().map(f => ({ title: f.title, content: f.content })), []);
  const redirects = useMemo(() => getAllFeatRedirects(), []);

  const unmatchedLinks = useMemo(() => {
    const featTitles = new Set(feats.map((f) => f.title.toLowerCase()));
    const redirectFroms = new Set(redirects.map((r) => r.from_title.toLowerCase()));
    const allTargets = extractAllLinkTargets(feats);
    return allTargets.filter(
      (t) => !featTitles.has(t.toLowerCase()) && !redirectFroms.has(t.toLowerCase())
    ).sort();
  }, [feats, redirects]);

  return (
    <Card className="border-primary/20 opacity-60">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" /> Wiki Redirects
        </CardTitle>
        <CardDescription>
          Redirects are now hardcoded in the source code. Wiki sync is disabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{unmatchedLinks.length} unmatched link(s)</span>
          <span>·</span>
          <span>{redirects.length} redirect(s) stored</span>
        </div>

        {redirects.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Stored Redirects</p>
            <div className="rounded-lg border border-border overflow-hidden max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead></TableHead>
                    <TableHead>To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redirects.map((r) => (
                    <TableRow key={r.from_title}>
                      <TableCell className="font-medium text-sm">{r.from_title}</TableCell>
                      <TableCell><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                      <TableCell className="text-sm text-primary">{r.to_title}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
