import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getFormation } from "@/lib/formations";
import { SubstitutionPlanner } from "./SubstitutionPlanner";
import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";

vi.mock("@/hooks/useSeasonMinutesMap", () => ({
  useSeasonMinutesMap: () => new Map(),
}));

vi.mock("@/hooks/useShowCardMinutes", () => ({
  useShowCardMinutes: () => [true, vi.fn()],
}));

vi.mock("@/components/match/FormationSelector", () => ({
  FormationSelector: () =>
    require("react").createElement(
      "label",
      null,
      "Formatie",
      require("react").createElement("select", {
        "aria-label": "Formatie",
        defaultValue: "",
      })
    ),
}));

const mockUseMutation = vi.mocked(useMutation);

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("SubstitutionPlanner", () => {
  const matchId = "match1" as Id<"matches">;
  const resolvedFormation = getFormation("8v8_1-3-3-1");
  const mockAddPlanItem = vi.fn().mockResolvedValue("plan-new");
  const mockClearPendingPlan = vi.fn().mockResolvedValue({ removed: 1 });
  const mockRemovePlanItem = vi.fn().mockResolvedValue(undefined);
  const mockSkipPlanItem = vi.fn().mockResolvedValue(undefined);
  const mockExecutePlanItem = vi.fn().mockResolvedValue(undefined);
  const mockUpdatePlanItem = vi.fn().mockResolvedValue(undefined);

  const players: MatchPlayer[] = [
    {
      matchPlayerId: "mp-gk" as Id<"matchPlayers">,
      playerId: "gk" as Id<"players">,
      name: "Keeper",
      number: 1,
      onField: true,
      isKeeper: true,
      fieldSlotIndex: 0,
    },
    {
      matchPlayerId: "mp-a" as Id<"matchPlayers">,
      playerId: "a" as Id<"players">,
      name: "Jan",
      number: 10,
      onField: true,
      isKeeper: false,
      fieldSlotIndex: 1,
    },
    {
      matchPlayerId: "mp-b" as Id<"matchPlayers">,
      playerId: "b" as Id<"players">,
      name: "Piet",
      number: 7,
      onField: true,
      isKeeper: false,
      fieldSlotIndex: 2,
    },
    {
      matchPlayerId: "mp-c" as Id<"matchPlayers">,
      playerId: "c" as Id<"players">,
      name: "Henk",
      number: 11,
      onField: false,
      isKeeper: false,
    },
  ];

  const existingPlans: SubstitutionPlanRow[] = [
    {
      _id: "plan-1" as Id<"substitutionPlans">,
      matchId,
      sequence: 0,
      kind: "substitution",
      targetQuarter: 1,
      playerOutId: "a" as Id<"players">,
      playerInId: "c" as Id<"players">,
      status: "pending",
      createdAt: 1,
      updatedAt: 1,
      outName: "Jan",
      inName: "Henk",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (
      mockUseMutation as unknown as {
        mockImplementation: (
          implementation: (mutationId: unknown) => unknown
        ) => void;
      }
    ).mockImplementation((mutationId: unknown) => {
      if (mutationId === api.substitutionPlans.addPlanItem) return mockAddPlanItem;
      if (mutationId === api.substitutionPlans.clearPendingPlan) {
        return mockClearPendingPlan;
      }
      if (mutationId === api.substitutionPlans.removePlanItem) {
        return mockRemovePlanItem;
      }
      if (mutationId === api.substitutionPlans.skipPlanItem) {
        return mockSkipPlanItem;
      }
      if (mutationId === api.substitutionPlans.executePlanItem) {
        return mockExecutePlanItem;
      }
      if (mutationId === api.substitutionPlans.updatePlanItem) {
        return mockUpdatePlanItem;
      }
      return vi.fn().mockResolvedValue(undefined);
    });
  });

  function renderPlanner() {
    return render(
      <SubstitutionPlanner
        matchId={matchId}
        teamId={"team1" as Id<"teams">}
        publicCode="ABC123"
        teamName="JO13-2"
        opponent="TSC"
        status="lineup"
        quarterCount={4}
        plans={existingPlans}
        players={players}
        resolvedFormation={resolvedFormation}
        canEditPlan
        canExecute={false}
      />
    );
  }

  it("renders pitch and plan columns together", () => {
    renderPlanner();

    expect(
      screen.getByText(/Wisselplan · JO13-2 vs TSC/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Formatie")).toBeInTheDocument();
    expect(screen.getByText("K1")).toBeInTheDocument();
    expect(screen.getByText(/Openstaand \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Jan → Henk/)).toBeInTheDocument();
    expect(screen.getByText("Plan leegmaken")).toBeInTheDocument();
  });

  it("creates a plan row from pitch taps", async () => {
    renderPlanner();

    fireEvent.click(screen.getByText("Piet 7"));
    fireEvent.click(screen.getByText("JAN"));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalledWith({
        matchId,
        playerOutId: "b",
        playerInId: "a",
        targetQuarter: 1,
        insertAtQuarterBoundary: true,
      });
    });
  });

  it("asks for confirmation before clearing pending rows", async () => {
    renderPlanner();

    fireEvent.click(screen.getByRole("button", { name: "Plan leegmaken" }));
    expect(
      screen.getByRole("button", { name: /Zeker weten/ })
    ).toBeInTheDocument();
    expect(mockClearPendingPlan).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Zeker weten/ }));

    await waitFor(() => {
      expect(mockClearPendingPlan).toHaveBeenCalledWith({ matchId });
    });
  });

  it("creates a field plan with a typed minute", async () => {
    renderPlanner();

    fireEvent.change(screen.getByLabelText("Min"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByText("Piet 7"));
    fireEvent.click(screen.getByText("JAN"));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalledWith({
        matchId,
        playerOutId: "b",
        playerInId: "a",
        targetQuarter: 1,
        targetMinute: 12,
        insertAtQuarterBoundary: false,
      });
    });
  });

  it("lets the coach set a minute on an existing plan row", async () => {
    renderPlanner();

    const minuteInputs = screen.getAllByPlaceholderText("min");
    fireEvent.change(minuteInputs[0]!, { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Zetten" }));

    await waitFor(() => {
      expect(mockUpdatePlanItem).toHaveBeenCalledWith({
        planId: "plan-1",
        targetMinute: 18,
      });
    });
  });
});
