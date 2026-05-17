const SCENARIO_ID_ALIASES: Record<string, string> = {
  "a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78": "a2b3c4d5-e6f7-4890-ab12-cd34ef56ab78",
  "d4e5f6a7-b8c9-4d01-ef23-456789abcdef": "d4e5f6a7-b8c9-4d01-af23-456789abcdef",
  "f6a7b8c9-d0e1-4f23-4567-89abcdef0123": "f6a7b8c9-d0e1-4f23-8567-89abcdef0123",
  "e8f9a0b1-c2d3-4e4f-5678-90abcdef1234": "e8f9a0b1-c2d3-4e4f-9678-90abcdef1234",
};

export function normalizeScenarioId(id: string | null | undefined): string | null | undefined {
  if (!id) return id;
  return SCENARIO_ID_ALIASES[id] ?? id;
}