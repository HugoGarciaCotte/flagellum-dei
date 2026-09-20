import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import type FeatListItem from "./FeatListItem";
import CharacterDetailsDialog from "./CharacterDetailsDialog";
import CharacterFeatPicker from "./CharacterFeatPicker";
import { getRow, setTable, upsertRow } from "@/lib/localStore";

vi.mock("@/i18n/useTranslation", () => ({ useTranslation: () => ({ locale: "en", t: (key: string) => key }) }));
vi.mock("@/lib/syncManager", () => ({ triggerPush: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock("./CharacterSheet", () => ({ default: (props: ComponentProps<typeof CharacterFeatPicker>) => <CharacterFeatPicker {...props} /> }));
vi.mock("./PageHeader", () => ({ default: ({ title, rightActions }: { title: string; rightActions: ReactNode }) => <header>{title}{rightActions}</header> }));
vi.mock("./PortraitViewer", () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock("./FeatListItem", () => ({ default: (props: ComponentProps<typeof FeatListItem>) => (
  <div data-testid={props.feat.id}>
    {props.feat.title}<span>{props.specialityValue}</span><span>{props.exhaustionLabel}</span>
    {props.onUse && <button onClick={props.onUse}>Use</button>}
    {props.onRecharge && <button onClick={props.onRecharge}>Recharge</button>}
    {props.actions}{props.collapsedContent}{props.expandedContent}
  </div>
) }));
vi.mock("@/data/feats", () => {
  const feats = ["parent", "child", "free", "transforming", "transformed"].map(id => ({ id, title: `${id} feat`, categories: [], content: null, raw_content: null }));
  return {
    getAllFeats: () => feats,
    getFeatById: (id: string) => feats.find(f => f.id === id),
    getFeatMeta: (feat: { id: string }) => ({ specialities: ["Herbalism"], transforms_to: feat.id === "transforming" ? "transformed" : undefined }),
    getFeatExhaustion: (feat: { id: string }) => feat.id === "transforming" ? "transforms_on_use" : "once_forever",
  };
});

const legacyParent = { id: "old-parent", character_id: "c1", feat_id: "parent", level: 1, is_free: false, note: "Herbalism", used_forever: true };
const embeddedParent = { feat_id: "parent", level: 1, is_free: false, note: "Herbalism", subfeats: [{ slot: 1, feat_id: "child", used_forever: true }] };
const showGM = () => render(<CharacterDetailsDialog characterId="c1" open onOpenChange={() => {}} canEdit editMode="gm" />);

beforeEach(() => {
  for (const table of ["characters", "character_feats", "character_feat_subfeats", "games", "game_players"] as const) setTable(table, []);
  setTable("characters", [{ id: "c1", user_id: "player", name: "Inquisitor" }]);
});
afterEach(cleanup);

describe("GM character feats", () => {
  it("shows legacy feats and subfeats in the default GM details view without writing on read", () => {
    setTable("character_feats", [legacyParent, { ...legacyParent, id: "other", character_id: "c2", feat_id: "free" }]);
    setTable("character_feat_subfeats", [{ id: "old-child", character_feat_id: "old-parent", slot: 1, subfeat_id: "child", used_forever: true }]);
    showGM();
    expect(screen.getByText("parent feat")).toBeInTheDocument();
    expect(screen.getByText("child feat")).toBeInTheDocument();
    expect(screen.queryByText("free feat")).not.toBeInTheDocument();
    expect(screen.getByText("Herbalism")).toBeInTheDocument();
    expect(getRow("characters", "c1")).not.toHaveProperty("feats");
  });

  it("prefers the embedded document and excludes deleted legacy feats and subfeats", () => {
    setTable("character_feats", [legacyParent, { ...legacyParent, id: "deleted", feat_id: "free", deleted_at: "2026-01-01" }]);
    setTable("character_feat_subfeats", [{ id: "deleted-child", character_feat_id: "old-parent", slot: 1, subfeat_id: "child", deleted_at: "2026-01-01" }]);
    showGM();
    expect(screen.getByText("parent feat")).toBeInTheDocument();
    expect(screen.queryByText("free feat")).not.toBeInTheDocument();
    expect(screen.queryByText("child feat")).not.toBeInTheDocument();
    act(() => upsertRow("characters", { id: "c1", name: "Inquisitor", feats: [{ feat_id: "free", is_free: true }] }));
    expect(screen.getByText("free feat")).toBeInTheDocument();
    expect(screen.queryByText("parent feat")).not.toBeInTheDocument();
  });

  it("edits the same legacy feats from the GM dialog", () => {
    setTable("character_feats", [legacyParent]);
    showGM();
    fireEvent.click(screen.getByLabelText("character.edit"));
    expect(screen.getByText("parent feat")).toBeInTheDocument();
    expect(within(screen.getByTestId("parent")).getByText("used")).toBeInTheDocument();
  });

  it("persists a legacy feat action to the embedded document while preserving sibling state", () => {
    setTable("character_feats", [legacyParent]);
    setTable("character_feat_subfeats", [{ id: "old-child", character_feat_id: "old-parent", slot: 1, subfeat_id: "child", used_forever: true }]);
    showGM();
    fireEvent.click(within(screen.getByTestId("parent")).getByText("Recharge"));
    const char = getRow<{ feats: typeof embeddedParent[] }>("characters", "c1");
    expect(char.feats[0]).toMatchObject({ feat_id: "parent", used_forever: false, note: "Herbalism", subfeats: [{ slot: 1, feat_id: "child", used_forever: true }] });
  });

  it("does not resurrect stale legacy feats for an authoritative empty document", () => {
    setTable("characters", [{ id: "c1", name: "Inquisitor", feats: [] }]);
    setTable("character_feats", [legacyParent]);
    render(<CharacterFeatPicker characterId="c1" mode="gm" />);
    expect(screen.queryByText("parent feat")).not.toBeInTheDocument();
  });

  it("preserves subfeat exhaustion in the GM editor and recharges the correct slot", () => {
    setTable("characters", [{ id: "c1", name: "Inquisitor", feats: [embeddedParent] }]);
    render(<CharacterFeatPicker characterId="c1" mode="gm" />);
    const child = within(screen.getByTestId("child"));
    expect(child.getByText("used")).toBeInTheDocument();
    expect(child.queryByText("Use")).not.toBeInTheDocument();
    fireEvent.click(child.getByText("Recharge"));
    expect(getRow<{ feats: typeof embeddedParent[] }>("characters", "c1").feats[0].subfeats[0].used_forever).toBe(false);
  });

  it.each(["details", "editor"])("transforms a subfeat on use in the GM %s", (view) => {
    setTable("characters", [{ id: "c1", name: "Inquisitor", feats: [{ ...embeddedParent, subfeats: [{ slot: 1, feat_id: "transforming" }] }] }]);
    if (view === "details") showGM();
    else render(<CharacterFeatPicker characterId="c1" mode="gm" />);
    fireEvent.click(within(screen.getByTestId("transforming")).getByText("Use"));
    expect(getRow<{ feats: typeof embeddedParent[] }>("characters", "c1").feats[0]).toMatchObject({
      feat_id: "parent", note: "Herbalism",
      subfeats: [{ slot: 1, feat_id: "transformed", exhausted_at: null, exhausted_scenario_id: null, used_forever: false }],
    });
    expect(screen.getByText("transformed feat")).toBeInTheDocument();
  });

  it("shows saved note-based specialities and reacts to character document updates", () => {
    setTable("characters", [{ id: "c1", name: "Inquisitor", feats: [embeddedParent] }]);
    showGM();
    expect(screen.getByText("Herbalism")).toBeInTheDocument();
    act(() => upsertRow("characters", { id: "c1", name: "Inquisitor", feats: [{ feat_id: "free", is_free: true }] }));
    expect(screen.getByText("free feat")).toBeInTheDocument();
    expect(screen.queryByText("parent feat")).not.toBeInTheDocument();
  });
});
