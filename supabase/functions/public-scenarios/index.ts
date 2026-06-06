// Public read-only API for scenarios. No auth required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import scenariosData from "./scenarios-data.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cacheHeaders = { "Cache-Control": "public, max-age=300" };

type Scenario = {
  id: string;
  title: string;
  teaser: string | null;
  level: number | null;
  content: string | null;
  fr?: { title?: string; teaser?: string; content?: string };
};

function applyOverrides(s: Scenario, fields: Map<string, any>): Scenario {
  if (!fields.size) return s;
  const result: Scenario = { ...s };
  const fr: any = { ...(s.fr || {}) };
  let hasFr = !!s.fr;
  for (const [field, value] of fields) {
    if (field.startsWith("fr:")) { fr[field.slice(3)] = value; hasFr = true; }
    else if (field === "title") result.title = value;
    else if (field === "teaser") result.teaser = value;
    else if (field === "level") result.level = value;
    else if (field === "content") result.content = value;
  }
  if (hasFr) result.fr = fr;
  return result;
}

function localize(s: Scenario, locale?: string): Scenario {
  if (!locale || locale === "en" || !s.fr) return s;
  return {
    ...s,
    title: s.fr.title ?? s.title,
    teaser: s.fr.teaser ?? s.teaser,
    content: s.fr.content ?? s.content,
  };
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: overrideRows } = await admin
      .from("scenario_overrides")
      .select("scenario_id, field, value");

    const overrides = new Map<string, Map<string, any>>();
    for (const row of overrideRows ?? []) {
      if (!overrides.has(row.scenario_id)) overrides.set(row.scenario_id, new Map());
      overrides.get(row.scenario_id)!.set(row.field, row.value);
    }

    let scenarios = (scenariosData.scenarios as Scenario[]).map(s => {
      const o = overrides.get(s.id);
      return o ? applyOverrides(s, o) : s;
    });
    if (locale && locale !== "en") scenarios = scenarios.map(s => localize(s, locale));

    if (id) {
      const scenario = scenarios.find(s => s.id === id);
      if (!scenario) {
        return new Response(JSON.stringify({ error: "Scenario not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(scenario), {
        headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ scenarios, count: scenarios.length }),
      { headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("public-scenarios error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
