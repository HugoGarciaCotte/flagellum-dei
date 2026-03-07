import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIKI_API = "https://prima.wiki/api.php";

interface EmbeddedFeatMeta {
  description: string | null;
  prerequisites: string | null;
  specialities: string[] | null;
  subfeats: any[] | null;
  unlocks_categories: string[] | null;
  blocking: string[] | null;
}

function parseEmbeddedFeatMeta(content: string): EmbeddedFeatMeta {
  const result: EmbeddedFeatMeta = {
    description: null, prerequisites: null, specialities: null, subfeats: null, unlocks_categories: null, blocking: null,
  };
  const tagRegex = /<!--@\s*([\w:]+)\s*:\s*(.*?)\s*@-->/g;
  let match: RegExpExecArray | null;
  const subfeatSlots: any[] = [];
  while ((match = tagRegex.exec(content)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key === "feat_one_liner") result.description = value;
    else if (key === "feat_prerequisites") result.prerequisites = value;
    else if (key === "feat_specialities") result.specialities = value.split(",").map(s => s.trim()).filter(Boolean);
    else if (key === "feat_unlocks") result.unlocks_categories = value.split(",").map(s => s.trim()).filter(Boolean);
    else if (key === "feat_blocking") result.blocking = value.split(",").map(s => s.trim()).filter(Boolean);
    else if (key.startsWith("feat_subfeat:")) {
      const slotNum = parseInt(key.split(":")[1], 10);
      if (isNaN(slotNum)) continue;
      const parts = value.split(",").map(s => s.trim());
      if (parts.length < 2) continue;
      const kind = parts[0] as "fixed" | "list" | "type";
      let optional = false; let valueStart = 1;
      if (parts[1] === "optional") { optional = true; valueStart = 2; }
      const rest = parts.slice(valueStart).join(",").trim();
      const slot: any = { slot: slotNum, kind, optional };
      if (kind === "fixed") slot.feat_title = rest;
      else if (kind === "list") slot.options = rest.split("|").map(s => s.trim()).filter(Boolean);
      else if (kind === "type") slot.filter = rest;
      subfeatSlots.push(slot);
    }
  }
  if (subfeatSlots.length > 0) result.subfeats = subfeatSlots.sort((a, b) => a.slot - b.slot);
  return result;
}

function generateParseableBlock(meta: EmbeddedFeatMeta): string {
  const lines: string[] = [];
  if (meta.description?.trim()) lines.push(`<!--@ feat_one_liner: ${meta.description.trim()} @-->`);
  if (meta.prerequisites?.trim()) lines.push(`<!--@ feat_prerequisites: ${meta.prerequisites.trim()} @-->`);
  if (meta.specialities && meta.specialities.length > 0) lines.push(`<!--@ feat_specialities: ${meta.specialities.join(", ")} @-->`);
  if (meta.subfeats && meta.subfeats.length > 0) {
    for (const s of meta.subfeats) {
      const parts: string[] = [s.kind];
      if (s.optional) parts.push("optional");
      if (s.kind === "fixed" && s.feat_title) parts.push(s.feat_title);
      else if (s.kind === "list" && s.options) parts.push(s.options.join("|"));
      else if (s.kind === "type" && s.filter) parts.push(s.filter);
      lines.push(`<!--@ feat_subfeat:${s.slot}: ${parts.join(", ")} @-->`);
    }
  }
  if (meta.unlocks_categories && meta.unlocks_categories.length > 0) lines.push(`<!--@ feat_unlocks: ${meta.unlocks_categories.join(", ")} @-->`);
  if (meta.blocking && meta.blocking.length > 0) lines.push(`<!--@ feat_blocking: ${meta.blocking.join(", ")} @-->`);
  if (lines.length === 0) return "";
  return `<!--@ PARSEABLE FIELDS START @-->\n${lines.join("\n")}\n<!--@ PARSEABLE FIELDS END @-->`;
}

function stripParseableBlock(content: string): string {
  return content.replace(/\n*<!--@ PARSEABLE FIELDS START @-->[\s\S]*?<!--@ PARSEABLE FIELDS END @-->\n*/g, "").trimEnd();
}

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

  const tokenUrl = `${WIKI_API}?action=query&meta=tokens&type=login&format=json`;
  const tokenRes = await fetch(tokenUrl);
  collectCookies(tokenRes);
  const tokenData = await tokenRes.json();
  const loginToken = tokenData?.query?.tokens?.logintoken;
  if (!loginToken) throw new Error("Failed to get login token");

  const loginBody = new URLSearchParams({
    action: "login", lgname: username, lgpassword: password, lgtoken: loginToken, format: "json",
  });
  const loginRes = await fetch(WIKI_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies.join("; ") },
    body: loginBody.toString(),
  });
  collectCookies(loginRes);
  const loginData = await loginRes.json();
  if (loginData?.login?.result !== "Success") throw new Error(`Wiki login failed: ${JSON.stringify(loginData?.login)}`);
  return { cookies };
}

async function getEditToken(session: WikiSession): Promise<string> {
  const url = `${WIKI_API}?action=query&meta=tokens&type=csrf&format=json`;
  const res = await fetch(url, { headers: { Cookie: session.cookies.join("; ") } });
  for (const val of res.headers.getSetCookie?.() || []) { session.cookies.push(val.split(";")[0]); }
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
  const res = await fetch(url.toString(), { headers: { Cookie: session.cookies.join("; ") } });
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const pageId = Object.keys(pages)[0];
  if (pageId === "-1") return null;
  return pages[pageId]?.revisions?.[0]?.slots?.main?.["*"] ?? null;
}

async function editPage(title: string, content: string, token: string, session: WikiSession, summary: string): Promise<void> {
  const body = new URLSearchParams({
    action: "edit", title, text: content, token, summary, format: "json", bot: "true",
  });
  const res = await fetch(WIKI_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: session.cookies.join("; ") },
    body: body.toString(),
  });
  const data = await res.json();
  if (data?.edit?.result !== "Success") throw new Error(`Edit failed: ${JSON.stringify(data)}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id, ids, mode } = await req.json();
    const featIds: string[] = ids || (id ? [id] : []);
    if (featIds.length === 0) {
      return new Response(JSON.stringify({ error: "No feat id(s) provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: feats, error: fetchErr } = await supabase
      .from("feats")
      .select("*")
      .in("id", featIds);
    if (fetchErr) throw fetchErr;
    if (!feats || feats.length === 0) {
      return new Response(JSON.stringify({ error: "No feats found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await wikiLogin();

    // ===== PREVIEW MODE =====
    if (mode === "preview") {
      const results: { title: string; id: string; status: string; error?: string }[] = [];
      for (const feat of feats) {
        try {
          const pageContent = await getPageContent(feat.title, session);
          if (pageContent === null) {
            results.push({ title: feat.title, id: feat.id, status: "not_found" });
            continue;
          }

          // Compare parseable blocks
          const dbMeta = parseEmbeddedFeatMeta(feat.content || "");
          const dbBlock = generateParseableBlock(dbMeta);
          const wikiMeta = parseEmbeddedFeatMeta(pageContent);
          const wikiBlock = generateParseableBlock(wikiMeta);

          if (dbBlock === wikiBlock) {
            results.push({ title: feat.title, id: feat.id, status: "unchanged" });
          } else if (!dbBlock && wikiBlock) {
            results.push({ title: feat.title, id: feat.id, status: "delete" });
          } else if (dbBlock && !wikiBlock) {
            results.push({ title: feat.title, id: feat.id, status: "new" });
          } else {
            results.push({ title: feat.title, id: feat.id, status: "modified" });
          }
        } catch (e: any) {
          results.push({ title: feat.title, id: feat.id, status: "error", error: e.message });
        }
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== EXECUTE MODE =====
    const editToken = await getEditToken(session);
    const results: { title: string; status: string; error?: string }[] = [];

    for (const feat of feats) {
      try {
        const pageContent = await getPageContent(feat.title, session);
        if (pageContent === null) {
          results.push({ title: feat.title, status: "skipped", error: "Page not found on wiki" });
          continue;
        }

        // Parse metadata from DB content
        const meta = parseEmbeddedFeatMeta(feat.content || "");
        const newBlock = generateParseableBlock(meta);

        // Strip old parseable block from wiki source, append new one
        const strippedWiki = stripParseableBlock(pageContent);
        const updatedContent = newBlock
          ? strippedWiki + "\n\n" + newBlock
          : strippedWiki;

        if (updatedContent.trimEnd() === pageContent.trimEnd()) {
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
