import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIKI_API = "https://prima.wiki/api.php";

interface WikiSession {
  cookies: string[];
}

async function wikiLogin(): Promise<WikiSession> {
  const username = Deno.env.get("WIKI_USERNAME");
  const password = Deno.env.get("WIKI_PASSWORD");
  if (!username || !password) throw new Error("Wiki credentials not configured");

  const cookies: string[] = [];

  const collectCookies = (res: Response) => {
    for (const val of res.headers.getSetCookie?.() || []) {
      cookies.push(val.split(";")[0]);
    }
  };

  // Step 1: Get login token
  const tokenUrl = `${WIKI_API}?action=query&meta=tokens&type=login&format=json`;
  const tokenRes = await fetch(tokenUrl);
  collectCookies(tokenRes);
  const tokenData = await tokenRes.json();
  const loginToken = tokenData?.query?.tokens?.logintoken;
  if (!loginToken) throw new Error("Failed to get login token");

  // Step 2: Login
  const loginBody = new URLSearchParams({
    action: "login",
    lgname: username,
    lgpassword: password,
    lgtoken: loginToken,
    format: "json",
  });

  const loginRes = await fetch(WIKI_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.join("; "),
    },
    body: loginBody.toString(),
  });
  collectCookies(loginRes);
  const loginData = await loginRes.json();

  if (loginData?.login?.result !== "Success") {
    throw new Error(`Wiki login failed: ${JSON.stringify(loginData?.login)}`);
  }

  return { cookies };
}

async function getEditToken(session: WikiSession): Promise<string> {
  const url = `${WIKI_API}?action=query&meta=tokens&type=csrf&format=json`;
  const res = await fetch(url, {
    headers: { Cookie: session.cookies.join("; ") },
  });
  for (const val of res.headers.getSetCookie?.() || []) {
    session.cookies.push(val.split(";")[0]);
  }
  const data = await res.json();
  const token = data?.query?.tokens?.csrftoken;
  if (!token) throw new Error("Failed to get CSRF token");
  return token;
}

async function getPageContent(title: string, session: WikiSession): Promise<string | null> {
  const url = new URL(WIKI_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("rvprop", "content");
  url.searchParams.set("rvslots", "main");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { Cookie: session.cookies.join("; ") },
  });
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const pageId = Object.keys(pages)[0];
  if (pageId === "-1") return null;

  return pages[pageId]?.revisions?.[0]?.slots?.main?.["*"] ?? null;
}

async function editPage(title: string, content: string, token: string, session: WikiSession, summary: string): Promise<void> {
  const body = new URLSearchParams({
    action: "edit",
    title,
    text: content,
    token,
    summary,
    format: "json",
    bot: "true",
  });

  const res = await fetch(WIKI_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: session.cookies.join("; "),
    },
    body: body.toString(),
  });
  const data = await res.json();
  if (data?.edit?.result !== "Success") {
    throw new Error(`Edit failed: ${JSON.stringify(data)}`);
  }
}

function generateParseableBlock(feat: any): string {
  const lines: string[] = [];

  if (feat.description?.trim()) {
    lines.push(`<!--@ feat_one_liner: ${feat.description.trim()} @-->`);
  }
  if (feat.specialities && feat.specialities.length > 0) {
    lines.push(`<!--@ feat_specialities: ${feat.specialities.join(", ")} @-->`);
  }
  if (feat.subfeats && Array.isArray(feat.subfeats) && feat.subfeats.length > 0) {
    for (const s of feat.subfeats) {
      const parts: string[] = [s.kind];
      if (s.optional) parts.push("optional");
      if (s.kind === "fixed" && s.feat_title) parts.push(s.feat_title);
      else if (s.kind === "list" && s.options) parts.push(s.options.join("|"));
      else if (s.kind === "type" && s.filter) parts.push(s.filter);
      lines.push(`<!--@ feat_subfeat:${s.slot}: ${parts.join(", ")} @-->`);
    }
  }
  if (feat.unlocks_categories && feat.unlocks_categories.length > 0) {
    lines.push(`<!--@ feat_unlocks: ${feat.unlocks_categories.join(", ")} @-->`);
  }

  if (lines.length === 0) return "";

  return `<!--@ PARSEABLE FIELDS START @-->\n${lines.join("\n")}\n<!--@ PARSEABLE FIELDS END @-->`;
}

function mergeParseableBlock(existingContent: string, newBlock: string): string {
  const startMarker = "<!--@ PARSEABLE FIELDS START @-->";
  const endMarker = "<!--@ PARSEABLE FIELDS END @-->";

  const startIdx = existingContent.indexOf(startMarker);
  const endIdx = existingContent.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing block
    const before = existingContent.substring(0, startIdx).trimEnd();
    const after = existingContent.substring(endIdx + endMarker.length).trimStart();
    if (!newBlock) return (before + (after ? "\n" + after : "")).trimEnd();
    return (before + "\n" + newBlock + (after ? "\n" + after : "")).trimEnd();
  }

  // Append at end
  if (!newBlock) return existingContent;
  return existingContent.trimEnd() + "\n\n" + newBlock;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id, ids } = await req.json();
    const featIds: string[] = ids || (id ? [id] : []);
    if (featIds.length === 0) {
      return new Response(JSON.stringify({ error: "No feat id(s) provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch feats from DB
    const { data: feats, error: fetchErr } = await supabase
      .from("feats")
      .select("*")
      .in("id", featIds);
    if (fetchErr) throw fetchErr;
    if (!feats || feats.length === 0) {
      return new Response(JSON.stringify({ error: "No feats found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Login to wiki once
    const session = await wikiLogin();
    const editToken = await getEditToken(session);

    const results: { title: string; status: string; error?: string }[] = [];

    for (const feat of feats) {
      try {
        const pageContent = await getPageContent(feat.title, session);
        if (pageContent === null) {
          results.push({ title: feat.title, status: "skipped", error: "Page not found on wiki" });
          continue;
        }

        const newBlock = generateParseableBlock(feat);
        const updatedContent = mergeParseableBlock(pageContent, newBlock);

        if (updatedContent === pageContent) {
          results.push({ title: feat.title, status: "unchanged" });
          continue;
        }

        await editPage(feat.title, updatedContent, editToken, session, "Update parseable fields via TRPG Helper");
        results.push({ title: feat.title, status: "updated" });
      } catch (e: any) {
        results.push({ title: feat.title, status: "error", error: e.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
