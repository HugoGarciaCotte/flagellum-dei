// Auto-generated from database — do not edit manually
// Generated on 2026-03-10T15:47:43.388Z

import { getCachedScenarioOverrides, applyScenarioOverrides } from "@/lib/scenarioOverrides";

export interface Scenario {
  id: string;
  title: string;
  description: string | null;
  level: number | null;
  content: string | null;
}

export const scenario1: Scenario = {
  id: "b830f194-9f41-4632-b628-9bae1e552780",
  title: "Danse Macabre Part 1",
  description: "Investigators at a remote Austrian abbey must solve a series of ritualistic murders linked to a pagan curse.",
  level: 1,
  content: null,
};

export const scenario2: Scenario = {
  id: "bf8e0f36-3f7a-4d98-b49e-71ccb4e6c5c7",
  title: "Danse Macabre Part 2",
  description: "An investigation into a murderous cult within Provins leads the inquisitors into a web of satanic rituals and political conspiracy.",
  level: 2,
  content: null,
};

export const scenario3: Scenario = {
  id: "f1d9a7b2-6e4c-4a38-9d15-8b7c2e3f4a5d",
  title: "Danse Macabre Part 3",
  description: "Inquisitors uncover dark secrets in Castille involving heretical alchemists and a deadly plague spreading through a besieged city.",
  level: 3,
  content: null,
};

export const scenario4: Scenario = {
  id: "a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78",
  title: "Danse Macabre Part 4",
  description: null,
  level: 4,
  content: null,
};

export const scenario5: Scenario = {
  id: "d4e5f6a7-b8c9-4d01-ef23-456789abcdef",
  title: "Danse Macabre Part 5",
  description: "During the Black Death in Marseille, inquisitors must navigate plague, famine, and supernatural terror to save a dying lord.",
  level: 5,
  content: null,
};

export const scenario6: Scenario = {
  id: "f6a7b8c9-d0e1-4f23-4567-89abcdef0123",
  title: "Danse Macabre Part 6",
  description: null,
  level: 6,
  content: null,
};

export const scenario7: Scenario = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  title: "Danse Macabre Part 7",
  description: null,
  level: 7,
  content: null,
};

export const scenario8: Scenario = {
  id: "e8f9a0b1-c2d3-4e4f-5678-90abcdef1234",
  title: "Danse Macabre Part 8",
  description: "Inquisitors travel to the Isle of Man to rescue a princess and confront a pagan witch's terrifying cult.",
  level: 8,
  content: null,
};

export const scenario9: Scenario = {
  id: "2867a8e2-1593-4b68-a4f2-de2ea8ea6ac4",
  title: "Danse Macabre Part 9",
  description: "Templars investigate a cursed scroll and the Secretum Templi while enduring Egyptian plagues across the Arabian desert.",
  level: 9,
  content: null,
};

const hardcodedScenarios: Scenario[] = [scenario1, scenario2, scenario3, scenario4, scenario5, scenario6, scenario7, scenario8, scenario9];

/** Returns all scenarios, with DB overrides applied if loaded. */
export function getAllScenarios(): Scenario[] {
  const overrides = getCachedScenarioOverrides();
  if (!overrides || overrides.size === 0) return hardcodedScenarios;
  return hardcodedScenarios.map(s => applyScenarioOverrides(s, overrides));
}

/** Returns the raw hardcoded scenarios without any overrides. */
export function getHardcodedScenarios(): Scenario[] {
  return hardcodedScenarios;
}

export function getScenarioById(id: string): Scenario | undefined {
  const overrides = getCachedScenarioOverrides();
  const scenario = hardcodedScenarios.find(s => s.id === id);
  if (!scenario) return undefined;
  return overrides ? applyScenarioOverrides(scenario, overrides) : scenario;
}
