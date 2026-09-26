import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoState } from "@/lib/team-portal/fixtures";
import { createRosterDemoState, type LocalDemoRoster } from "@/lib/team-portal/localRoster";
import { JO13_02_DEMO_PROFILE } from "@/lib/team-portal/demoProfiles";
import type { DemoActor, DemoState } from "@/lib/team-portal/types";
import { TeamPortalDemo } from "./TeamPortalDemo";

const setup = vi.hoisted(() => ({
  actor: { role: "player", playerId: "p1" } as DemoActor,
  state: null as DemoState | null,
  observe: vi.fn(),
}));

vi.mock("@/hooks/useTeamPortalDemo", () => ({
  useTeamPortalDemo: function useDemoHook() {
    const [actor, setActor] = useState(setup.actor);
    return {
      state: setup.state!, actor, setActor, now: 1800000000000, ready: true,
      run: vi.fn(), reset: vi.fn(), storageWarning: "", notice: null,
      dismissNotice: vi.fn(),
    };
  },
}));
vi.mock("./CoachWorkspace", () => ({ CoachWorkspace: () => <div>Coachfeedback</div> }));
vi.mock("./MemberOverview", () => ({ MemberOverview: () => <div>Spelerinformatie</div> }));
vi.mock("./TeamOverview", () => ({ TeamOverview: () => <div>Teamoverzicht</div> }));
vi.mock("./VotingPanel", () => ({ VotingPanel: () => <div>Stemformulier</div> }));
vi.mock("./ObservationWorkspace", () => ({
  ObservationWorkspace: (props: { actor: DemoActor; state: DemoState }) => {
    setup.observe(props);
    return <div>Observatiegegevens</div>;
  },
}));

beforeEach(() => {
  setup.actor = { role: "player", playerId: "p1" };
  setup.state = createDemoState(1800000000000);
  setup.observe.mockClear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

const desktopNav = () => within(screen.getByRole("navigation", { name: "Teamportaal" }));

describe("professional observation navigation", () => {
  it("switches explicitly simulated parents without pretending unrelated players are siblings", () => {
    const roster: LocalDemoRoster = { version: 1, teamSlug: "jo13-2", importedAt: "2026-09-26T12:00:00Z", players: [
      { id: "local-first", name: "Eerste testspeler", number: 2, position: "CB" },
      { id: "local-second", name: "Tweede testspeler", number: null, position: "" },
    ] };
    setup.state = createRosterDemoState(roster);
    setup.actor = { role: "player", playerId: "local-first" };
    render(<TeamPortalDemo profile={{ ...JO13_02_DEMO_PROFILE, roster }} />);
    expect(screen.getByText(/echte teamgegevens, lokale demo/)).toBeInTheDocument();
    expect(screen.queryByText(/fictieve voorbeeldspelers/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ouder", exact: true }));
    const parent = screen.getByRole("combobox", { name: "Oudersimulatie" });
    expect(within(screen.getByRole("combobox", { name: "Mijn kind" })).getAllByRole("option")).toHaveLength(1);
    fireEvent.change(parent, { target: { value: "parent-local-second" } });
    expect(screen.getByRole("heading", { name: "Samen groeien met Tweede testspeler" })).toBeInTheDocument();
    expect(within(screen.getByRole("combobox", { name: "Mijn kind" })).getByRole("option", { name: "Tweede testspeler" })).toBeInTheDocument();
    expect(within(screen.getByRole("combobox", { name: "Mijn kind" })).queryByRole("option", { name: "Eerste testspeler" })).not.toBeInTheDocument();
  });

  it("keeps observations discoverable for coaches while the optional module is off", () => {
    render(<TeamPortalDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Coach" }));

    expect(desktopNav().getByRole("button", { name: "Nabespreking" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Even stilstaan bij iedere speler" })).toBeInTheDocument();
    fireEvent.click(desktopNav().getByRole("button", { name: "Ontwikkeling" }));
    expect(screen.getByText("Coachfeedback")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Wedstrijd" })).toBeInTheDocument();
    expect(setup.observe).not.toHaveBeenCalled();
    fireEvent.click(desktopNav().getByRole("button", { name: "Observaties" }));

    expect(screen.getByText("Observatiegegevens")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Wedstrijd" })).not.toBeInTheDocument();
    expect(setup.observe.mock.lastCall?.[0]).toMatchObject({ actor: { role: "coach" } });
    expect(Boolean(setup.observe.mock.lastCall?.[0].state.observationsEnabled)).toBe(false);
    expect(desktopNav().getByRole("button", { name: "Ontwikkeling" })).toBeInTheDocument();
    expect(desktopNav().getByRole("button", { name: "Wedstrijdwaardering" })).toBeInTheDocument();
  });

  it("opens scouts directly into observations with no feedback, team or voting navigation", () => {
    render(<TeamPortalDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Scout" }));

    expect(screen.getByText("Observatiegegevens")).toBeInTheDocument();
    expect(setup.observe.mock.lastCall?.[0]).toMatchObject({ actor: { role: "scout" } });
    for (const name of ["Teamportaal", "Teamportaal mobiel"]) {
      const nav = within(screen.getByRole("navigation", { name }));
      expect(nav.getAllByRole("button")).toHaveLength(1);
      expect(nav.getByRole("button", { name: "Observaties" })).toHaveAttribute("aria-current", "page");
    }
    expect(screen.queryByText("Coachfeedback")).not.toBeInTheDocument();
    expect(screen.queryByText("Stemformulier")).not.toBeInTheDocument();
    expect(screen.queryByText("Teamoverzicht")).not.toBeInTheDocument();
    expect(screen.queryByText("Spelerinformatie")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Wedstrijd" })).not.toBeInTheDocument();
  });

  it.each(["Speler", "Ouder"])("removes observation navigation and data when switching to %s", (roleLabel) => {
    render(<TeamPortalDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Scout" }));
    expect(screen.getByText("Observatiegegevens")).toBeInTheDocument();
    setup.observe.mockClear();

    fireEvent.click(screen.getByRole("button", { name: roleLabel }));
    expect(screen.queryByRole("button", { name: "Observaties" })).not.toBeInTheDocument();
    expect(screen.queryByText("Observatiegegevens")).not.toBeInTheDocument();
    expect(screen.getByText("Spelerinformatie")).toBeInTheDocument();
    expect(setup.observe).not.toHaveBeenCalled();
  });

  it("uses the scout's allowed default even if the shell initially selected the member tab", () => {
    setup.actor = { role: "scout" };
    render(<TeamPortalDemo />);
    expect(screen.getByText("Observatiegegevens")).toBeInTheDocument();
    expect(screen.queryByText("Spelerinformatie")).not.toBeInTheDocument();
  });
});
