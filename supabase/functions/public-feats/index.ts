// Public read-only API for feats. No auth required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import featsData from "./feats-data.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cacheHeaders = { "Cache-Control": "public, max-age=300" };

type Feat = {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
  meta?: any;
  fr?: { title?: string; description?: string; prerequisites?: string; special?: string };
};

const META_FIELDS = new Set([
  "description", "prerequisites", "special", "specialities",
  "subfeats", "unlocks_categories", "blocking", "synonyms", "exhaustion",
]);

function applyOverrides(feat: Feat, fields: Map<string, any>): Feat {
  if (!fields.size) return feat;
  const result: Feat = { ...feat };
  const meta = { ...(feat.meta || {}) };
  const fr: any = { ...(feat.fr || {}) };
  let hasFr = !!feat.fr;
  for (const [field, value] of fields) {
    if (field.startsWith("fr:")) { fr[field.slice(3)] = value; hasFr = true; }
    else if (field === "title") result.title = value;
    else if (field === "categories") result.categories = value;
    else if (META_FIELDS.has(field)) meta[field] = value;
  }
  result.meta = meta;
  if (hasFr) result.fr = fr;
  return result;
}

function localize(feat: Feat, locale?: string): Feat {
  if (!locale || locale === "en" || !feat.fr) return feat;
  const result = { ...feat };
  if (feat.fr.title) result.title = feat.fr.title;
  if (feat.meta && (feat.fr.description || feat.fr.prerequisites || feat.fr.special)) {
    result.meta = {
      ...feat.meta,
      ...(feat.fr.description ? { description: feat.fr.description } : {}),
      ...(feat.fr.prerequisites ? { prerequisites: feat.fr.prerequisites } : {}),
      ...(feat.fr.special ? { special: feat.fr.special } : {}),
    };
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || undefined;
    const id = url.searchParams.get("id");

    // Load DB overrides via service role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: overrideRows } = await admin
      .from("feat_overrides")
      .select("feat_id, field, value");

    const overrides = new Map<string, Map<string, any>>();
    for (const row of overrideRows ?? []) {
      if (!overrides.has(row.feat_id)) overrides.set(row.feat_id, new Map());
      overrides.get(row.feat_id)!.set(row.field, row.value);
    }

    let feats = (featsData.feats as Feat[]).map(f => {
      const o = overrides.get(f.id);
      return o ? applyOverrides(f, o) : f;
    });
    if (locale && locale !== "en") feats = feats.map(f => localize(f, locale));

    if (id) {
      const feat = feats.find(f => f.id === id);
      if (!feat) {
        return new Response(JSON.stringify({ error: "Feat not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(feat), {
        headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ feats, redirects: featsData.redirects ?? [], count: feats.length }),
      { headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("public-feats error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
