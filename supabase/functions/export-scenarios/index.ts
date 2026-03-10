import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("scenarios")
    .select("id, title, description, level, content")
    .order("level", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Output as a TypeScript module
  let output = `// Auto-generated from database — do not edit manually\n`;
  output += `// Generated on ${new Date().toISOString()}\n\n`;
  output += `export interface Scenario {\n  id: string;\n  title: string;\n  description: string | null;\n  level: number | null;\n  content: string | null;\n}\n\n`;

  for (const s of data) {
    const varName = `scenario${s.level}`;
    output += `export const ${varName}: Scenario = {\n`;
    output += `  id: ${JSON.stringify(s.id)},\n`;
    output += `  title: ${JSON.stringify(s.title)},\n`;
    output += `  description: ${JSON.stringify(s.description)},\n`;
    output += `  level: ${JSON.stringify(s.level)},\n`;
    output += `  content: ${JSON.stringify(s.content)},\n`;
    output += `};\n\n`;
  }

  output += `export const scenarios: Scenario[] = [${data.map(s => `scenario${s.level}`).join(", ")}];\n\n`;
  output += `export function getAllScenarios(): Scenario[] {\n  return scenarios;\n}\n\n`;
  output += `export function getScenarioById(id: string): Scenario | undefined {\n  return scenarios.find(s => s.id === id);\n}\n`;

  return new Response(output, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
});
