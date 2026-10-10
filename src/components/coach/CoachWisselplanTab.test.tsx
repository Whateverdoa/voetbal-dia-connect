import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "convex/react";
import { getFormation } from "@/lib/formations";
import { plannedSwap, wisselplanMatch } from "@/test/fixtures/wisselplan";
import { CoachWisselplanTab } from "./CoachWisselplanTab";
import type { Match } from "@/components/match/types";

vi.mock("@/hooks/useSeasonMinutesMap", () => ({ useSeasonMinutesMap: () => new Map() }));
vi.mock("@/hooks/useShowCardMinutes", () => ({ useShowCardMinutes: () => [false, vi.fn()] }));
vi.mock("@/components/match/FormationSelector", () => ({ FormationSelector: () => null }));

const execute = Object.assign(vi.fn(), { withOptimisticUpdate: vi.fn() });

function tab(surface: "mobile" | "pc", match: Match = wisselplanMatch, canExecute = true) {
  return <CoachWisselplanTab match={match} surface={surface}
    resolvedFormation={getFormation("8v8_1-3-3-1")} canEditPlan={match.status === "scheduled" || match.status === "lineup" || match.isCurrentCoachLead === true} canExecute={canExecute} />;
}

describe("restored coach wisselplan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue(undefined);
    vi.mocked(useMutation).mockReturnValue(execute);
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }));
  });

  it.each(["mobile", "pc"] as const)("shows the saved plan on %s and preserves referee/coach responsibilities", (surface) => {
    render(tab(surface));
    expect(screen.getByText(/Openstaand \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Piet → v: Jan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wissel uitvoeren" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Verwijderen" })).toBeEnabled();
  });

  it("executes once, disables while saving and shows completed history after the live update", async () => {
    let finish!: () => void;
    execute.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { rerender } = render(tab("mobile"));
    const button = screen.getByRole("button", { name: "Wissel uitvoeren" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ planId: plannedSwap._id, correlationId: expect.any(String) });
    await act(async () => finish());
    rerender(tab("mobile", { ...wisselplanMatch, substitutionPlans: [{ ...plannedSwap, status: "executed" }] }));
    expect(screen.getByText(/Afgerond \(1\)/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wissel uitvoeren" })).not.toBeInTheDocument();
  });

  it("keeps a failed swap visible and lets the coach retry", async () => {
    execute.mockRejectedValueOnce(new Error("Verbinding verbroken"));
    render(tab("mobile"));
    fireEvent.click(screen.getByRole("button", { name: "Wissel uitvoeren" }));
    await waitFor(() => expect(screen.getByText("Verbinding verbroken")).toBeInTheDocument());
    expect(screen.getByText(/Openstaand \(1\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wissel uitvoeren" })).toBeEnabled();
  });

  it.each(["scheduled", "lineup", "finished"] as const)("does not execute in status %s", (status) => {
    render(tab("mobile", { ...wisselplanMatch, status }));
    expect(screen.queryByRole("button", { name: "Wissel uitvoeren" })).not.toBeInTheDocument();
  });

  it("shows the plan without execution rights to a coach without the lead", () => {
    render(tab("mobile", { ...wisselplanMatch, isCurrentCoachLead: false }, false));
    expect(screen.getByText(/Openstaand \(1\)/)).toBeInTheDocument();
    expect(screen.queryByText("Wissel plannen")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wissel uitvoeren" })).not.toBeInTheDocument();
  });
  it("plans on the phone before kickoff using the projected squad without executing a real swap", async () => {
    render(tab("mobile", { ...wisselplanMatch, status: "scheduled" }));
    fireEvent.click(screen.getByText("Wissel plannen"));
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "piet" } });
    fireEvent.change(selects[1], { target: { value: "jan" } });
    fireEvent.change(screen.getByPlaceholderText("bijv. 35"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Wissel toevoegen" }));
    await waitFor(() => expect(execute).toHaveBeenCalledWith({
      matchId: wisselplanMatch._id, playerOutId: "piet", playerInId: "jan",
      kind: "substitution", targetMinute: 25, targetQuarter: 1, insertAtQuarterBoundary: false,
    }));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Wissel uitvoeren" })).not.toBeInTheDocument();
  });

  it("closes planning after the match", () => {
    render(tab("mobile", { ...wisselplanMatch, status: "finished" }));
    expect(screen.queryByText("Wissel plannen")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verwijderen" })).not.toBeInTheDocument();
  });

});
