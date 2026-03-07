import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchCategoryMembers(category: string): Promise<string[]> {
  const titles: string[] = [];
  let cmcontinue: string | undefined;

  do {
    const url = new URL("https://prima.wiki/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", `Category:${category}`);
    url.searchParams.set("cmlimit", "500");
    url.searchParams.set("format", "json");
    if (cmcontinue) url.searchParams.set("cmcontinue", cmcontinue);

    const res = await fetch(url.toString());
    const data = await res.json();
    const members = data?.query?.categorymembers || [];
    for (const m of members) {
      titles.push(m.title as string);
    }
    cmcontinue = data?.continue?.cmcontinue;
  } while (cmcontinue);

  return titles;
}

function findFirstDiff(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return i;
  }
  return a.length !== b.length ? len : -1;
}

const CATEGORY_MAP: Record<string, string> = {
  Archetypes: "Archetype",
  Prowesses: "Prowess",
  "General Feats": "General Feat",
  Hidden: "Hidden Feat",
  "Dark Feats": "Dark Feat",
};

/** Fetch raw wikitext (preserves HTML comments) via revisions API */
async function fetchRawContent(title: string): Promise<string> {
  const url = new URL("https://prima.wiki/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("rvprop", "content");
  url.searchParams.set("format", "json");
  const res = await fetch(url.toString());
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return "";
  const pageId = Object.keys(pages)[0];
  if (pageId === "-1") return "";
  return pages[pageId]?.revisions?.[0]?.["*"] ?? "";
}

/** Fetch expanded content (templates resolved, HTML comments stripped) via expandtemplates API */
async function fetchExpandedContent(title: string): Promise<string> {
  const pageUrl = `https://prima.wiki/api.php?action=expandtemplates&title=${encodeURIComponent(title)}&text={{:${encodeURIComponent(title)}}}&prop=wikitext&format=json`;
  const pageRes = await fetch(pageUrl);
  const pageData = await pageRes.json();
  return pageData?.expandtemplates?.wikitext || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: owner only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mode = "execute";
    try {
      const body = await req.json();
      if (body?.mode) mode = body.mode;
    } catch {
      // no body = default execute
    }

    // Fetch Feats, Official, and all type categories in parallel
    const categoryKeys = Object.keys(CATEGORY_MAP);
    const [featTitles, officialTitles, ...typeLists] = await Promise.all([
      fetchCategoryMembers("Feats"),
      fetchCategoryMembers("Official"),
      ...categoryKeys.map((cat) => fetchCategoryMembers(cat)),
    ]);

    const officialSet = new Set(officialTitles);
    const intersectedTitles = featTitles.filter((t) => officialSet.has(t));

    // Build category lookup: title -> string[]
    const categoryLookup = new Map<string, string[]>();
    typeLists.forEach((list, idx) => {
      const label = CATEGORY_MAP[categoryKeys[idx]];
      for (const title of list) {
        const existing = categoryLookup.get(title);
        if (existing) {
          existing.push(label);
        } else {
          categoryLookup.set(title, [label]);
        }
      }
    });

    if (intersectedTitles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, items: [], total: 0, message: "No feats found in both Feats and Official categories" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing feats (include raw_content for comparison)
    const { data: existingFeats } = await adminClient
      .from("feats")
      .select("id, title, content, raw_content, categories");
    const existingMap = new Map(
      (existingFeats || []).map((f: any) => [f.title, f])
    );

    // Fetch each page content — both raw and expanded
    const items: { title: string; status: "new" | "modified" | "unchanged"; categories: string[]; diff?: any }[] = [];
    const rawContents = new Map<string, string>();
    const expandedContents = new Map<string, string>();

    for (const title of intersectedTitles) {
      const categories = categoryLookup.get(title) || [];
      try {
        const [rawContent, expandedContent] = await Promise.all([
          fetchRawContent(title),
          fetchExpandedContent(title),
        ]);

        if (!rawContent && !expandedContent) continue;
        rawContents.set(title, rawContent);
        expandedContents.set(title, expandedContent);

        const existing = existingMap.get(title);
        if (!existing) {
          items.push({ title, status: "new", categories });
        } else {
          const dbExpanded = (existing.content || "").trim();
          const dbRaw = (existing.raw_content || "").trim();
          const newExpanded = expandedContent.trim();
          const newRaw = rawContent.trim();
          const expandedChanged = dbExpanded !== newExpanded;
          const rawChanged = dbRaw !== newRaw;
          const categoriesChanged = JSON.stringify(existing.categories || []) !== JSON.stringify(categories);
          if (expandedChanged || rawChanged || categoriesChanged) {
            const pad = 40;
            const idx = findFirstDiff(dbExpanded, newExpanded);
            const diff = {
              expandedChanged,
              rawChanged,
              categoriesChanged,
              firstDiffAt: idx,
              dbSnippet: idx >= 0 ? JSON.stringify(dbExpanded.slice(Math.max(0, idx - pad), idx + pad)) : null,
              wikiSnippet: idx >= 0 ? JSON.stringify(newExpanded.slice(Math.max(0, idx - pad), idx + pad)) : null,
              dbLength: dbExpanded.length,
              wikiLength: newExpanded.length,
            };
            items.push({ title, status: "modified", categories, diff });
          } else {
            items.push({ title, status: "unchanged", categories });
          }
        }
      } catch {
        items.push({ title, status: "new", categories });
      }
    }

    if (mode === "preview") {
      return new Response(
        JSON.stringify({ success: true, items, total: items.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute: upsert new + modified — pure content sync, NO AI
    let imported = 0;
    const errors: string[] = [];
    const toProcess = items.filter((i) => i.status !== "unchanged");

    const BATCH_SIZE = 5;
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const expandedContent = expandedContents.get(item.title) || "";
          const rawContent = rawContents.get(item.title) || "";
          const existing = existingMap.get(item.title);

          const payload: any = {
            content: expandedContent,
            raw_content: rawContent,
            categories: item.categories,
          };

          if (existing) {
            await adminClient
              .from("feats")
              .update(payload)
              .eq("id", existing.id);
          } else {
            await adminClient
              .from("feats")
              .insert({ title: item.title, ...payload });
          }
          return item.title;
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") imported++;
        else errors.push(r.reason?.message || "Unknown error");
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, total: intersectedTitles.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
