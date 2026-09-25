import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoState } from "@/lib/team-portal/fixtures";
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
  it("keeps observations discoverable for coaches while the optional module is off", () => {
    render(<TeamPortalDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Coach" }));

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
