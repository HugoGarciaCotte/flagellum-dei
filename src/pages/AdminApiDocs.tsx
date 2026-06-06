import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, Copy, Check } from "lucide-react";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/nav/BackButton";
import PageHeader from "@/components/PageHeader";
import FullPageLoader from "@/components/FullPageLoader";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const BASE = `${SUPABASE_URL}/functions/v1`;

const FEATS_URL = `${BASE}/public-feats`;
const SCENARIOS_URL = `${BASE}/public-scenarios`;

const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied" });
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative">
      <pre className="bg-muted/40 border border-border rounded-md p-3 text-xs overflow-x-auto pr-10">
        <code className="whitespace-pre-wrap break-all">{code}</code>
      </pre>
      <Button size="icon" variant="ghost" className="absolute top-1.5 right-1.5 h-7 w-7" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
};

const Endpoint = ({
  title, url, description, params, example,
}: { title: string; url: string; description: string; params: { name: string; desc: string }[]; example: string }) => (
  <Card className="border-primary/20">
    <CardHeader>
      <CardTitle className="font-display flex items-center gap-2 text-lg">
        <Badge variant="outline" className="font-mono text-xs">GET</Badge> {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">URL</p>
        <CodeBlock code={url} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Query parameters (all optional)</p>
        <ul className="text-sm space-y-1">
          {params.map(p => (
            <li key={p.name}>
              <code className="text-primary font-mono text-xs">{p.name}</code>
              <span className="text-muted-foreground"> — {p.desc}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Example</p>
        <CodeBlock code={example} />
      </div>
    </CardContent>
  </Card>
);

const AdminApiDocs = () => {
  const navigate = useNavigate();
  const { isOwner, isLoading } = useIsOwner();

  if (isLoading) return <FullPageLoader />;
  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">Access denied</p>
        <Button onClick={() => navigate("/")} variant="outline">Return home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Public API"
        icon={<Cloud className="h-5 w-5 text-primary" />}
        leftAction={<BackButton to="/admin" />}
      />
      <main className="container py-8 max-w-3xl space-y-6">
        <div className="space-y-2">
          <h2 className="font-display text-2xl">Read all game content, no login needed</h2>
          <p className="text-muted-foreground">
            Anyone can fetch the full library of feats and scenarios — including any edits you've made in
            the admin panel — by sending an HTTP <code className="text-primary font-mono">GET</code> request to the URLs
            below. No API key, no authentication, no headers required. Responses are cached for 5 minutes.
          </p>
          <p className="text-muted-foreground">
            Use these endpoints to build companion tools, character sheets, wikis, or mirrors of the rulebook.
            Player data (characters, games, accounts) is <strong>not</strong> exposed.
          </p>
        </div>

        <Endpoint
          title="All feats"
          url={FEATS_URL}
          description="Returns every feat with its merged metadata (description, prerequisites, exhaustion, subfeats, etc.) plus title redirects."
          params={[
            { name: "locale", desc: "en (default) or fr" },
            { name: "id", desc: "UUID of a single feat" },
          ]}
          example={`curl "${FEATS_URL}?locale=fr"`}
        />

        <Endpoint
          title="All scenarios"
          url={SCENARIOS_URL}
          description="Returns every scenario with its full wikitext content, level, and teaser."
          params={[
            { name: "locale", desc: "en (default) or fr" },
            { name: "id", desc: "UUID of a single scenario" },
          ]}
          example={`curl "${SCENARIOS_URL}?id=b830f194-9f41-4632-b628-9bae1e552780"`}
        />

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Response shape</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`// /public-feats
{
  "feats": [
    {
      "id": "uuid",
      "title": "Faith",
      "categories": ["Spiritual"],
      "content": "wikitext...",
      "meta": {
        "description": "...",
        "prerequisites": "...",
        "exhaustion": "infinite"
      },
      "fr": { "title": "Foi", "description": "..." }
    }
  ],
  "redirects": [{ "from_title": "...", "to_title": "..." }],
  "count": 240
}

// /public-scenarios
{
  "scenarios": [
    {
      "id": "uuid",
      "title": "Chapter 1 - Societas Templois",
      "level": 1,
      "teaser": "...",
      "content": "wikitext..."
    }
  ],
  "count": 9
}`} />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Only <code className="text-primary font-mono">GET</code> is allowed. Other methods return 405.</p>
            <p>• CORS is open — browsers can call these directly from any domain.</p>
            <p>• Edits made in the admin panel appear automatically (no redeploy needed).</p>
            <p>• When new hardcoded feats or scenarios are added in code, run <code className="text-primary font-mono">bun run scripts/sync-public-api-data.ts</code> to refresh the API snapshot.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminApiDocs;
