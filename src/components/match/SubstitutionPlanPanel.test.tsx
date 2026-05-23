import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useMutation } from "convex/react";
import type { ComponentProps } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getFormation } from "@/lib/formations";
import { SubstitutionPlanPanel } from "./SubstitutionPlanPanel";
import type { MatchPlayer, SubstitutionPlanRow } from "./types";

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

describe("SubstitutionPlanPanel", () => {
  const matchId = "match1" as Id<"matches">;
  const resolvedFormation = getFormation("8v8_1-3-3-1");
  const mockAddPlanItem = vi.fn().mockResolvedValue("plan-new");
  const mockSkipPlanItem = vi.fn().mockResolvedValue(undefined);
  const mockExecutePlanItem = vi.fn().mockResolvedValue(undefined);
  const mockRemovePlanItem = vi.fn().mockResolvedValue(undefined);

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
    {
      matchPlayerId: "mp-d" as Id<"matchPlayers">,
      playerId: "d" as Id<"players">,
      name: "Bas",
      number: 12,
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

  function renderPanel(
    overrides?: Partial<ComponentProps<typeof SubstitutionPlanPanel>>
  ) {
    return render(
      <SubstitutionPlanPanel
        matchId={matchId}
        status="lineup"
        quarterCount={4}
        plans={existingPlans}
        players={players}
        resolvedFormation={resolvedFormation}
        canEditPlan
        canExecute={false}
        {...overrides}
      />
    );
  }

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
      if (mutationId === api.substitutionPlans.skipPlanItem) return mockSkipPlanItem;
      if (mutationId === api.substitutionPlans.executePlanItem) return mockExecutePlanItem;
      if (mutationId === api.substitutionPlans.removePlanItem) return mockRemovePlanItem;
      return vi.fn().mockResolvedValue(undefined);
    });
  });

  it("uses the projected virtual field and bench in list mode dropdowns", () => {
    renderPanel();

    const selects = screen.getAllByRole("combobox");
    const outOptions = within(selects[0]).getAllByRole("option").map((option) => option.textContent);
    const inOptions = within(selects[1]).getAllByRole("option").map((option) => option.textContent);

    expect(outOptions).toContain("Henk");
    expect(outOptions).toContain("Piet");
    expect(outOptions).not.toContain("Jan");
    expect(inOptions).toContain("Jan");
    expect(inOptions).toContain("Bas");
    expect(inOptions).not.toContain("Henk");
  });

  it("disables field mode when no formation is available", () => {
    renderPanel({ resolvedFormation: undefined });

    expect(screen.getByText("Planweergave")).toBeDisabled();
    expect(
      screen.getByText(/Kies eerst een formatie om Planweergave op het veld te gebruiken/)
    ).toBeInTheDocument();
  });

  it("renders quarter tabs for four-quarter matches in field mode", () => {
    renderPanel();

    fireEvent.click(screen.getByText("Planweergave"));

    expect(screen.getByText("K1")).toBeInTheDocument();
    expect(screen.getByText("K2")).toBeInTheDocument();
    expect(screen.getByText("K3")).toBeInTheDocument();
    expect(screen.getByText("K4")).toBeInTheDocument();
  });

  it("renders half tabs for two-period matches in field mode", () => {
    renderPanel({ quarterCount: 2 });

    fireEvent.click(screen.getByText("Planweergave"));

    expect(screen.getByText("H1")).toBeInTheDocument();
    expect(screen.getByText("H2")).toBeInTheDocument();
  });

  it("appends a field-created plan row for the selected quarter without a minute", async () => {
    renderPanel();

    fireEvent.click(screen.getByText("Planweergave"));
    fireEvent.click(screen.getByText("K2"));
    fireEvent.click(screen.getByText("PIET"));
    fireEvent.click(screen.getByText("JAN"));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalledWith({
        matchId,
        playerOutId: "b",
        playerInId: "a",
        targetQuarter: 2,
        insertAtQuarterBoundary: true,
      });
    });
  });

  it("creates a planned position swap when two field players are tapped", async () => {
    renderPanel();

    fireEvent.click(screen.getByText("Planweergave"));
    fireEvent.click(screen.getByText("PIET"));
    fireEvent.click(screen.getByText("KEEPER"));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalledWith({
        matchId,
        playerOutId: "b",
        playerInId: "gk",
        kind: "positionSwap",
        targetQuarter: 1,
        insertAtQuarterBoundary: true,
      });
    });
  });

  it("omits empty optional values when adding a row from list mode", async () => {
    renderPanel();

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "b" } });
    fireEvent.change(selects[1], { target: { value: "d" } });
    fireEvent.click(screen.getByRole("button", { name: "Toevoegen aan plan" }));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalledWith({
        matchId,
        playerOutId: "b",
        playerInId: "d",
        insertAtQuarterBoundary: false,
      });
    });
  });

  it("shows a quarterless-plan warning in field mode", () => {
    renderPanel({
      plans: [
        ...existingPlans,
        {
          _id: "plan-2" as Id<"substitutionPlans">,
          matchId,
          sequence: 1,
          kind: "substitution",
          playerOutId: "b" as Id<"players">,
          playerInId: "d" as Id<"players">,
          status: "pending",
          createdAt: 2,
          updatedAt: 2,
          outName: "Piet",
          inName: "Bas",
        },
      ],
    });

    fireEvent.click(screen.getByText("Planweergave"));

    expect(
      screen.getByText(/openstaande regel telt niet mee in deze kwartweergave/i)
    ).toBeInTheDocument();
  });
});
