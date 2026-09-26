import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoState } from "@/lib/team-portal/fixtures";
import { MemberOverview } from "./MemberOverview";
import { JO13_02_DEMO_PROFILE } from "@/lib/team-portal/demoProfiles";
import { createRosterDemoState, type LocalDemoRoster } from "@/lib/team-portal/localRoster";
import { DemoProfileProvider } from "./DemoProfileContext";
import { TeamOverview } from "./TeamOverview";

afterEach(cleanup);
const now = Date.UTC(2026, 8, 19, 12);
const roster: LocalDemoRoster = {
  version: 1,
  teamSlug: "jo13-2",
  importedAt: "2026-09-26T12:00:00Z",
  players: [{ id: "roster-player", name: "Testspeler", number: null, position: "Nog niet ingevoerd" }],
};

describe("MemberOverview", () => {
  it("does not invent card details or fixtures for an imported roster", () => {
    render(<DemoProfileProvider profile={{ ...JO13_02_DEMO_PROFILE, roster }}><MemberOverview state={createRosterDemoState(roster)} actor={{ role: "player", playerId: "roster-player" }} playerId="roster-player" now={now} onVote={vi.fn()} /></DemoProfileProvider>);
    const card = within(screen.getByRole("article", { name: "Spelerskaart van Testspeler" }));
    expect(card.getByText("Rugnummer nog niet ingevoerd")).toBeVisible();
    expect(card.queryByText("“”")).not.toBeInTheDocument();
    expect(screen.queryByText(/Parkstad JO13/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Zaterdag · 10:30 uur/)).not.toBeInTheDocument();
    expect(screen.queryByText(/#null|#undefined/)).not.toBeInTheDocument();
    expect(screen.getByText(/De coach heeft nog geen feedback gedeeld/)).toBeVisible();
  });

  it("labels the roster and example goal honestly and explains empty moments", () => {
    render(<DemoProfileProvider profile={{ ...JO13_02_DEMO_PROFILE, roster }}><TeamOverview state={createRosterDemoState(roster)} now={now} onVote={vi.fn()} /></DemoProfileProvider>);
    expect(screen.getByRole("heading", { name: "Onze selectie" })).toBeVisible();
    expect(screen.getByText("1 spelers")).toBeVisible();
    expect(screen.getByText("Voorbeeld van een teamdoel")).toBeVisible();
    expect(screen.queryByText(/Deze week oefenen we/)).not.toBeInTheDocument();
    expect(screen.getByText(/Er zijn nog geen goedgekeurde wedstrijdmomenten/)).toBeVisible();
    expect(screen.queryByText(/#null|#undefined/)).not.toBeInTheDocument();
  });

  it("shows published development to the linked parent while keeping newer drafts private", () => {
    const state = createDemoState(now);
    const publishedCompliment = state.feedback[0].published!.compliment;
    state.feedback[0].draft.compliment = "Dit concept is nog privé.";
    render(<MemberOverview state={state} actor={{ role: "parent", guardianId: "family1" }} playerId="p1" now={now} onVote={vi.fn()} />);
    expect(screen.queryByText("Dit concept is nog privé.")).not.toBeInTheDocument();
    expect(screen.getAllByText(publishedCompliment).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Ontwikkeling en coachfeedback" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Geef een teamgenoot een stem/ })).not.toBeInTheDocument();
  });

  it("shows an empty feedback state for a linked child whose only feedback is a draft", () => {
    const state = createDemoState(now);
    render(<MemberOverview state={state} actor={{ role: "parent", guardianId: "family1" }} playerId="p10" now={now} onVote={vi.fn()} />);
    expect(screen.queryByText(state.feedback[2].draft.compliment)).not.toBeInTheDocument();
    expect(screen.getByText(/Er is nog geen feedback gepubliceerd/)).toBeVisible();
  });

  it("does not reveal profile details for an unlinked child", () => {
    render(<MemberOverview state={createDemoState(now)} actor={{ role: "parent", guardianId: "family1" }} playerId="p2" now={now} onVote={vi.fn()} />);
    expect(screen.getByText("Dit profiel is niet beschikbaar.")).toBeVisible();
    expect(screen.queryByLabelText("Spelerskaart van Noor")).not.toBeInTheDocument();
    expect(screen.queryByText(/tikte een hoge bal/)).not.toBeInTheDocument();
  });

  it("separates the player profile from the complete development history and opens voting", async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    const state = createDemoState(now);
    const { rerender } = render(<MemberOverview state={state} actor={{ role: "player", playerId: "p1" }} playerId="p1" now={now} onVote={onVote} />);
    expect(screen.getByLabelText("Spelerskaart van Milan")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Ontwikkeling en coachfeedback" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Geef een teamgenoot een stem/ }));
    expect(onVote).toHaveBeenCalledOnce();

    rerender(<MemberOverview state={state} actor={{ role: "player", playerId: "p1" }} playerId="p1" now={now} onVote={onVote} view="development" />);
    for (const skill of ["Balvaardigheid", "Spelinzicht", "Samenspel", "Inzet", "Sportiviteit"]) expect(screen.getByText(skill)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Wedstrijd tegen Duinrand JO13" })).toBeVisible();
  });
});
