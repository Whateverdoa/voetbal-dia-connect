import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REESHOF_PLAN } from "@/lib/substitutions/reeshofPlan";
import { SubstitutionWorkspace } from "@/components/substitutions/SubstitutionWorkspace";
import { CoachAssistantPanel } from "./CoachAssistantPanel";
import type { DemoPlan } from "@/lib/substitutions/demoPlan";

afterEach(cleanup);

const selectionCheckbox = () => screen.getByRole("checkbox", { name: /Ik heb beschikbaarheid, keeper, datum/ });
const reviewCheckbox = () => screen.getByRole("checkbox", { name: /Ik heb de voorgestelde posities/ });

describe("coach assistant review flow", () => {
  it("builds a coach kickoff from an empty lineup, preserves it after applying and invalidates review on edits", async () => {
    const user = userEvent.setup(); const apply = vi.fn();
    const plan: DemoPlan = { match: { regulationDurationMinutes: 60, fieldPlayerCountIncludingKeeper: 3 },
      formation: { slots: [{ id: 0, position: "GK", x: 50, y: 90 }, { id: 1, position: "CB", x: 50, y: 60 }, { id: 2, position: "ST", x: 50, y: 20 }] },
      players: ["Keeper", "A", "B", "C"].map((name, number) => ({ key: name, name, number })),
      startingLineup: { keeperKey: "Keeper", field: [], bench: ["Keeper", "A", "B", "C"] }, steps: [] };
    const props = { plan, teamKey: "team", targetDate: "2026-11-07", disabled: false, onApply: apply };
    const view = render(<CoachAssistantPanel {...props} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Beginopstelling bepalen" }), "coach");
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Vul iedere beginpositie");
    await user.click(screen.getByRole("button", { name: "C 3" }));
    await user.click(screen.getByRole("button", { name: "Veldplek CB 2: leeg" }));
    await user.click(screen.getByRole("button", { name: "A 1" }));
    await user.click(screen.getByRole("button", { name: "Veldplek ST 3: leeg" }));
    expect(selectionCheckbox()).not.toBeChecked();
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    await user.click(reviewCheckbox());
    await user.click(screen.getByRole("button", { name: "Gebruik voorstel in oefenwedstrijd" }));
    const [saved, , settings] = apply.mock.calls[0];
    expect(saved.startingLineup.field).toEqual([{ playerKey: "C", slotId: 1 }, { playerKey: "A", slotId: 2 }, { playerKey: "Keeper", slotId: 0 }]);
    expect(saved.startingLineup.bench).toEqual(["B"]);
    expect(settings.manualStart).toBe(true);
    view.unmount();
    render(<CoachAssistantPanel {...props} plan={saved} initialSettings={settings} />);
    expect(screen.getByRole("combobox", { name: "Beginopstelling bepalen" })).toHaveValue("coach");
    await user.click(screen.getByText("Beginposities via keuzelijst aanpassen"));
    expect(screen.getByRole("combobox", { name: "Beginpositie CB, plek 2" })).toHaveValue("C");
    await user.selectOptions(screen.getByRole("combobox", { name: "Beginpositie CB, plek 2" }), "A");
    expect(screen.getByRole("combobox", { name: "Beginpositie ST, plek 3" })).toHaveValue("C");
    await user.selectOptions(screen.getByRole("combobox", { name: "Beschikbaarheid voorstel A 1" }), "absent");
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Vul iedere beginpositie");
  });

  it("defaults to a fixed keeper and requires renewed review when selecting a halftime replacement", async () => {
    const user = userEvent.setup();
    render(<CoachAssistantPanel plan={REESHOF_PLAN} teamKey="team" targetDate="2026-10-10" disabled={false} testOnly onApply={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Keeper niet wisselen" })).toBeChecked();
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    await user.click(screen.getByRole("checkbox", { name: "Keeper niet wisselen" }));
    expect(selectionCheckbox()).not.toBeChecked();
    expect(screen.queryByRole("region", { name: "Voorstel coachassistent" })).not.toBeInTheDocument();
    const replacement = REESHOF_PLAN.players.find((player) => !player.absent && player.key !== REESHOF_PLAN.startingLineup.keeperKey)!;
    await user.selectOptions(screen.getByRole("combobox", { name: "Keeper tweede helft" }), replacement.key);
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    expect(screen.getByText("Keeperwissel bij rust")).toBeVisible();
  });

  it("keeps coach minute caps and private reasons separate from the printable plan", async () => {
    const user = userEvent.setup(); const apply = vi.fn();
    render(<CoachAssistantPanel plan={REESHOF_PLAN} teamKey="team" targetDate="2026-10-10" disabled={false} onApply={apply} />);
    const player = REESHOF_PLAN.players.find((row) => !row.absent && row.key !== REESHOF_PLAN.startingLineup.keeperKey)!;
    const label = `${player.name} ${player.number}`;
    await user.type(screen.getByRole("spinbutton", { name: `Minuten van coach ${label}` }), "20");
    await user.selectOptions(screen.getByRole("combobox", { name: `Reden minutenafspraak ${label}` }), "team_agreement");
    await user.type(screen.getByRole("textbox", { name: `Coachnotitie minutenafspraak ${label}` }), "Interne afspraak");
    await user.click(selectionCheckbox()); await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    await user.click(reviewCheckbox()); await user.click(screen.getByRole("button", { name: "Gebruik voorstel in oefenwedstrijd" }));
    expect(apply).toHaveBeenCalledOnce();
    expect(apply.mock.calls[0][1]).toContainEqual(expect.objectContaining({ key: player.key, maxMinutes: 20, minutesReason: "team_agreement", minutesNote: "Interne afspraak" }));
    expect(JSON.stringify(apply.mock.calls[0][0])).not.toMatch(/team_agreement|Interne afspraak/);
  });
  it("requires selection review, explains incomplete evidence, and only applies an explicitly reviewed proposal", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<CoachAssistantPanel plan={REESHOF_PLAN} teamKey="team" targetDate="2026-10-10" disabled={false} onApply={onApply} />);
    expect(screen.getByRole("button", { name: "Voorstel berekenen" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Beschikbaarheid voorstel Luuk 4" })).toHaveValue("injured");
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    const result = screen.getByRole("region", { name: "Voorstel coachassistent" });
    expect(result).toHaveTextContent("Onvoldoende gecontroleerde minuten");
    expect(within(result).queryByRole("row", { name: /Luuk/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gebruik voorstel in oefenwedstrijd" })).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
    await user.click(reviewCheckbox());
    await user.click(screen.getByRole("button", { name: "Gebruik voorstel in oefenwedstrijd" }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.calls[0][0].review.sourceConfirmed).toBe(false);
  });

  it("invalidates a proposal and review after changing preferences or the underlying plan", async () => {
    const user = userEvent.setup();
    const props = { plan: REESHOF_PLAN, teamKey: "team", targetDate: "2026-10-10", disabled: false, onApply: vi.fn() };
    const view = render(<CoachAssistantPanel {...props} />);
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    await user.click(reviewCheckbox());
    await user.selectOptions(screen.getByRole("combobox", { name: "Eerste voorkeur Jody 2" }), "RB");
    expect(selectionCheckbox()).not.toBeChecked();
    expect(screen.queryByRole("region", { name: "Voorstel coachassistent" })).not.toBeInTheDocument();
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    view.rerender(<CoachAssistantPanel {...props} plan={{ ...REESHOF_PLAN, formation: { ...REESHOF_PLAN.formation, name: "Gewijzigde bron" } }} />);
    expect(selectionCheckbox()).not.toBeChecked();
    expect(screen.queryByRole("button", { name: "Gebruik voorstel in oefenwedstrijd" })).not.toBeInTheDocument();
  });

  it("adds only explicitly reviewed earlier history and rejects invalid minute values", async () => {
    const user = userEvent.setup();
    render(<CoachAssistantPanel plan={REESHOF_PLAN} teamKey="team" targetDate="2026-10-10" disabled={false} onApply={vi.fn()} />);
    await user.click(screen.getByText("Gecontroleerde wedstrijdhistorie toevoegen (0)"));
    fireEvent.change(screen.getByLabelText("Datum bronwedstrijd"), { target: { value: "2026-10-03" } });
    await user.type(screen.getByLabelText("Tegenstander bronwedstrijd"), "Vorige tegenstander");
    await user.selectOptions(screen.getByRole("combobox", { name: "Historische aanwezigheid Jody 2" }), "present");
    fireEvent.change(screen.getByLabelText("Historische speelminuten Jody 2"), { target: { value: "75" } });
    fireEvent.change(screen.getByLabelText("Historische keeperminuten Jody 2"), { target: { value: "0" } });
    const confirm = screen.getByRole("checkbox", { name: /Ik heb datum, aanwezigheid/ });
    await user.click(confirm);
    await user.click(screen.getByRole("button", { name: "Historie toevoegen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Controleer de minuten");
    fireEvent.change(screen.getByLabelText("Historische speelminuten Jody 2"), { target: { value: "45" } });
    expect(confirm).not.toBeChecked();
    await user.click(confirm);
    await user.click(screen.getByRole("button", { name: "Historie toevoegen" }));
    expect(screen.getByText("Gecontroleerde wedstrijdhistorie toevoegen (1)")).toBeVisible();
    expect(screen.getByRole("button", { name: "Verwijder historie Vorige tegenstander" })).toBeVisible();
  });

  it("moves a proposal into the existing demo review and can replay it to full time", async () => {
    const user = userEvent.setup();
    render(<SubstitutionWorkspace />);
    await user.click(screen.getByRole("button", { name: "Coachassistent" }));
    await user.click(selectionCheckbox());
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    await user.click(reviewCheckbox());
    await user.click(screen.getByRole("button", { name: "Gebruik voorstel in oefenwedstrijd" }));
    expect(screen.getByRole("button", { name: "Bron controleren" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, aanwezigheid, opstelling en wissels/ }));
    await user.click(screen.getByRole("button", { name: "Plan goedkeuren en proberen" }));
    await user.click(screen.getByRole("button", { name: "Speel resterend plan uit" }));
    expect(screen.getByRole("heading", { name: "Het plan naast de uitvoering" })).toBeVisible();
    const comparison = screen.getByRole("columnheader", { name: "Plan totaal" }).closest("table");
    expect(comparison).toHaveTextContent("660");
    await user.click(screen.getByRole("button", { name: "Coachassistent" }));
    expect(screen.getByRole("button", { name: "Voorstel berekenen" })).toBeDisabled();
  });
});
