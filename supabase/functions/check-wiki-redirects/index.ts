const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIKI_API = "https://prima.wiki/api.php";

async function fetchWikiContent(title: string): Promise<string | null> {
  const url = `${WIKI_API}?action=query&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=content&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const pages = json.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as any;
  if (page.missing !== undefined) return null;
  return page.revisions?.[0]?.["*"] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titles } = await req.json();
    if (!Array.isArray(titles) || titles.length === 0) {
      return new Response(JSON.stringify({ error: "titles array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { title: string; redirect_to: string | null; not_found: boolean }[] = [];

    // Process in batches of 10
    for (let i = 0; i < titles.length; i += 10) {
      const batch = titles.slice(i, i + 10);
      const promises = batch.map(async (title: string) => {
        const content = await fetchWikiContent(title);
        if (content === null) {
          return { title, redirect_to: null, not_found: true };
        }
        const match = content.match(/#REDIRECT\s*\[\[([^\]]+)\]\]/i);
        if (match) {
          return { title, redirect_to: match[1].trim(), not_found: false };
        }
        return { title, redirect_to: null, not_found: false };
      });
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
