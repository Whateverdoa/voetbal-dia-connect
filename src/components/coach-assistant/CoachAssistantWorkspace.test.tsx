import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assistantSourceFixture } from "@/test/fixtures/coachAssistant";
import { workspacePlan, workspaceRevision } from "../../../convex/lib/coachAssistantWorkspace";
import { CoachAssistantWorkspace, ConnectedEditor } from "./CoachAssistantWorkspace";

vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: { id: "test-coach" } }) }));

const mocks = vi.hoisted(() => ({ query: vi.fn(), save: vi.fn(), authenticated: true, client: { query: vi.fn() } }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: mocks.authenticated, isLoading: false }),
  useQuery: mocks.query, useMutation: () => mocks.save,
  useConvex: () => mocks.client,
}));

function data() {
  const source = assistantSourceFixture(); const { plan, warnings } = workspacePlan(source);
  return { matchId: source.match._id, teamId: source.match.teamId, code: "UYXS3M", teamName: "JO13-2", opponent: "Test2",
    scheduledAt: source.match.scheduledAt ?? null, canSave: true, revision: workspaceRevision(source), plan, warnings,
    preferences: plan.players.map((p) => ({ key: p.key, availability: p.absent ? "injured" as const : "present" as const, primaryPosition: null, secondaryPosition: null })),
  };
}
afterEach(cleanup);
beforeEach(() => {
  mocks.authenticated = true; mocks.save.mockReset().mockResolvedValue({ savedItems: 15, alreadySaved: false }); mocks.query.mockReset();
  mocks.client.query.mockReset().mockImplementation(async (reference, args) => mocks.query(reference, args));
  mocks.query.mockImplementation((reference: string, args: unknown) => {
    if (args === "skip") return undefined;
    if (reference === "userQueries:getMyRoles") return { roles: ["admin", "coach"] };
    if (reference === "matches:verifyCoachAccess") {
      if (args && typeof args === "object" && "seasonKey" in args) return { teams: [{ id: "other-team", name: "JO19-1" }], matches: [{ _id: "foreign", teamId: "other-team", teamName: "JO19-1", opponent: "Ander team", publicCode: "ABCDEF", status: "scheduled" }] };
      return { teams: [{ id: "test-team", name: "JO13-2" }], matches: [{ _id: "m", teamId: "test-team", teamName: "JO13-2", opponent: "Test2", publicCode: "UYXS3M", status: "scheduled", scheduledAt: 0 }] };
    }
    if (reference === "coachAssistant:workspace") return data();
    if (reference === "teams:getMatchHistory") return [];
    if (reference === "matches:getForCoach") {
      const source = assistantSourceFixture();
      return { ...source.match, teamName: "JO13-2", customFormationTemplate: null, substitutionPlans: [],
        players: source.players.map(({ entry, player }) => ({ ...entry, name: player.name, number: player.number,
          positionPrimary: player.positionPrimary, positionSecondary: player.positionSecondary,
          absent: entry.absent ?? false, injured: entry.injured ?? false })) };
    }
    return undefined;
  });
});

describe("connected coach workspace", () => {
  it("automatically loads only earlier team history through existing read queries", async () => {
    const defaultQuery = mocks.query.getMockImplementation()!;
    const detail = { ...defaultQuery("matches:getForCoach", {}), status: "finished", scheduledAt: Date.parse("2026-10-03T10:00:00+02:00"), frozenClockMs: 3600000, events: [] };
    detail.players = detail.players.map((player: { absent: boolean; injured: boolean }) => ({ ...player, minutesPlayed: player.absent || player.injured ? 0 : 30 }));
    mocks.client.query.mockResolvedValue(detail);
    mocks.query.mockImplementation((reference, args) => reference === "teams:getMatchHistory" ? [
      { id: "past-match", scheduledAt: detail.scheduledAt }, { id: "future-match", scheduledAt: Date.parse("2030-01-01") },
    ] : defaultQuery(reference, args));
    render(<ConnectedEditor current={data()} onReload={vi.fn()} testMode />);
    await waitFor(() => expect(screen.getByRole("region", { name: "Wedstrijdhistorie uit DIA Live" })).toHaveTextContent("1 eerdere gespeelde wedstrijden automatisch geladen"));
    expect(mocks.client.query).toHaveBeenCalledExactlyOnceWith("matches:getForCoach", { matchId: "past-match" });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("prepares an empty future lineup, reviews a proposal and replays it without app writes", async () => {
    const user = userEvent.setup();
    const current = data();
    current.plan.startingLineup = { keeperKey: "", field: [], bench: current.plan.players.filter((player) => !player.absent).map((player) => player.key) };
    render(<ConnectedEditor current={current} onReload={vi.fn()} testMode />);
    expect(screen.getByRole("button", { name: "1. Voorbereiden" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "2. Wisselplan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "3. Oefenen" })).toBeDisabled();
    const cappedPlayer = current.plan.players.find((player) => !player.absent && player.key !== data().plan.startingLineup.keeperKey)!;
    const capLabel = `Minuten van coach ${cappedPlayer.name} ${cappedPlayer.number ?? "?"}`;
    await user.type(screen.getByRole("spinbutton", { name: capLabel }), "20");
    await user.selectOptions(screen.getByRole("combobox", { name: "Wisselen iedere" }), "15");
    await user.selectOptions(screen.getByRole("combobox", { name: "Keeper voor voorstel" }), data().plan.startingLineup.keeperKey);
    await user.click(screen.getByRole("checkbox", { name: /Ik heb beschikbaarheid, keeper, datum/ }));
    await user.click(screen.getByRole("button", { name: "Voorstel berekenen" }));
    await user.click(screen.getByRole("checkbox", { name: /Ik heb de voorgestelde posities/ }));
    await user.click(screen.getByRole("button", { name: "Verder naar wisselplan" }));
    expect(screen.getByRole("button", { name: "2. Wisselplan" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "3. Oefenen" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers,/ }));
    await user.click(screen.getByRole("button", { name: "Bevestigen en naar oefenen" }));
    expect(screen.getByRole("button", { name: "3. Oefenen" })).toHaveAttribute("aria-current", "step");
    await user.click(screen.getByRole("button", { name: "+1 minuut" }));
    await user.click(screen.getByRole("button", { name: "4. Vergelijken" }));
    await user.click(screen.getByRole("button", { name: "1. Voorbereiden" }));
    expect(screen.getByRole("spinbutton", { name: capLabel })).toHaveValue(20);
    expect(screen.getByRole("combobox", { name: "Wisselen iedere" })).toHaveValue("15");
    await user.click(screen.getByRole("button", { name: "3. Oefenen" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("01:00");
    await user.click(screen.getByRole("button", { name: "Speel resterend plan uit" }));
    expect(screen.getByRole("heading", { name: "Het plan naast de uitvoering" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Oefening opnieuw beginnen met dit plan" }));
    expect(screen.getByRole("spinbutton", { name: capLabel })).toHaveValue(20);
    expect(screen.getByRole("combobox", { name: "Wisselen iedere" })).toHaveValue("15");
    await user.click(screen.getByRole("button", { name: "2. Wisselplan" }));
    await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers,/ }));
    await user.click(screen.getByRole("button", { name: "Bevestigen en naar oefenen" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    expect(screen.queryByRole("button", { name: "Opslaan in de wedstrijd" })).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("keeps an approved test plan and its simulation entirely local", async () => {
    const user = userEvent.setup();
    render(<CoachAssistantWorkspace initialCode="UYXS3M" testMode />);
    expect(screen.getByRole("region", { name: "Lokale testvoorbereiding" })).toHaveTextContent("Opslaan in de wedstrijd is uitgeschakeld");
    expect(screen.queryByRole("button", { name: "Opslaan in de wedstrijd" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "2. Wisselplan" }));
    await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, beschikbaarheid, opstelling en wissels/ }));
    await user.click(screen.getByRole("button", { name: "Bevestigen en naar oefenen" }));
    await user.click(screen.getByRole("button", { name: "+1 minuut" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("01:00");
    expect(screen.queryByRole("button", { name: "Opslaan in de wedstrijd" })).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalledWith("coachAssistant:workspace", expect.anything());
  });
  it("lets the coach fill a missing shirt number locally before rehearsing", async () => {
    const user = userEvent.setup();
    const current = data();
    const player = current.plan.players.find((candidate) => !candidate.absent)!;
    player.number = null;
    render(<ConnectedEditor current={current} onReload={vi.fn()} testMode />);
    await user.click(screen.getByRole("button", { name: "2. Wisselplan" }));
    await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers,/ }));
    expect(screen.getByRole("button", { name: "Bevestigen en naar oefenen" })).toBeDisabled();
    await user.type(screen.getByRole("spinbutton", { name: `Rugnummer ${player.name}` }), "99");
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers,/ })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers,/ }));
    await user.click(screen.getByRole("button", { name: "Bevestigen en naar oefenen" }));
    await user.click(screen.getByRole("button", { name: "+1 minuut" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("01:00");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("does not read an outside-team match in test mode, even with its code", () => {
    render(<CoachAssistantWorkspace initialCode="ABCDEF" testMode />);
    expect(screen.getByRole("alert")).toHaveTextContent("hoort niet bij je coachteams");
    expect(mocks.query).not.toHaveBeenCalledWith("matches:getForCoach", expect.objectContaining({ matchId: expect.anything() }));
    expect(mocks.query).not.toHaveBeenCalledWith("coachAssistant:workspace", expect.anything());
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("uses only coach teams even when the signed-in account also has the admin role", () => {
    render(<CoachAssistantWorkspace initialCode="" />);
    expect(mocks.query).toHaveBeenCalledWith("matches:verifyCoachAccess", {});
    expect(mocks.query).not.toHaveBeenCalledWith("matches:verifyCoachAccess", expect.objectContaining({ seasonKey: expect.anything() }));
    expect(screen.getByRole("option", { name: "JO13-2" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /JO19-1|ABCDEF/ })).not.toBeInTheDocument();
  });
  it("requires an actual match selection before showing the assistant and has no Reeshof fallback", async () => {
    const user = userEvent.setup(); render(<CoachAssistantWorkspace initialCode="" />);
    expect(screen.queryByRole("region", { name: "Coachassistent" })).not.toBeInTheDocument();
    expect(screen.queryByText(/SV Reeshof/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Wedstrijd kiezen" }), "UYXS3M");
    expect(screen.getByRole("region", { name: "Gekozen wedstrijd" })).toHaveTextContent("JO13-2 – Test2 (UYXS3M)");
    expect(mocks.query).toHaveBeenCalledWith("coachAssistant:workspace", { code: "UYXS3M" });
    expect(screen.getByRole("region", { name: "Coachassistent" })).toBeVisible();
  });
  it("requires complete source review before saving and targets only the chosen match", async () => {
    const user = userEvent.setup(); const current = data(); render(<ConnectedEditor current={current} onReload={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Opslaan in de wedstrijd" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "2. Wisselplan" }));
    await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, beschikbaarheid, opstelling en wissels/ }));
    await user.click(screen.getByRole("button", { name: "Bevestigen en naar oefenen" }));
    await user.click(screen.getByRole("button", { name: "Opslaan in de wedstrijd" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ matchId: current.matchId, expectedRevision: current.revision, reviewed: true,
      plan: expect.objectContaining({ startingLineup: current.plan.startingLineup }), requestId: expect.any(String) }));
    expect(screen.getByRole("button", { name: "Opslaan in de wedstrijd" })).toBeDisabled();
  });
  it("preserves a concept but blocks stale saves until explicit reload", async () => {
    const user = userEvent.setup(); const current = data(); const reload = vi.fn();
    const view = render(<ConnectedEditor current={current} onReload={reload} />);
    view.rerender(<ConnectedEditor current={{ ...current, revision: "another-coach-change" }} onReload={reload} />);
    expect(screen.getByText(/De gegevens in de app zijn gewijzigd/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Opslaan in de wedstrijd" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Actuele selectie en plan opnieuw laden" })); expect(reload).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("handles an unfilled match lineup through the assistant without crashing the simulator", async () => {
    const current = data(); current.plan.startingLineup = { keeperKey: "", field: [], bench: current.plan.players.filter((p) => !p.absent).map((p) => p.key) };
    render(<ConnectedEditor current={current} onReload={vi.fn()} />);
    expect(screen.getByText(/De huidige opstelling of wissellijst is nog niet volledig/)).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Keeper voor voorstel" })).toHaveValue("");
    expect(screen.getByRole("region", { name: "Coachassistent" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Opslaan in de wedstrijd" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Alle eerdere gespeelde wedstrijden van dit team laden/)).not.toBeInTheDocument());
  });
  it("does not load private match data while signed out", () => {
    mocks.authenticated = false; render(<CoachAssistantWorkspace initialCode="UYXS3M" />);
    expect(screen.getByRole("link", { name: "Inloggen" })).toBeVisible();
    expect(mocks.query).not.toHaveBeenCalledWith("coachAssistant:workspace", expect.anything());
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
