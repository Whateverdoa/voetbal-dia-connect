import { describe, expect, it, beforeAll, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { PresentSubstitutionPlanView } from "./PresentSubstitutionPlanView";
import type {
  PresentPlanPlayer,
  PresentPlanRow,
} from "@/lib/substitutions/presentPlanAdapters";

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

const formation: Formation = {
  name: "test",
  slots: [
    { id: 0, x: 50, y: 90, position: "GK" },
    { id: 1, x: 50, y: 50, position: "CM" },
    { id: 2, x: 50, y: 20, position: "ST" },
  ],
  links: [],
};

const players: PresentPlanPlayer[] = [
  {
    playerId: "gk",
    displayName: "Keeper",
    number: 1,
    onField: true,
    fieldSlotIndex: 0,
    isKeeper: true,
    absent: false,
  },
  {
    playerId: "a",
    displayName: "Piet",
    number: 7,
    onField: true,
    fieldSlotIndex: 1,
    isKeeper: false,
    absent: false,
  },
  {
    playerId: "b",
    displayName: "Jan",
    number: 10,
    onField: true,
    fieldSlotIndex: 2,
    isKeeper: false,
    absent: false,
  },
  {
    playerId: "c",
    displayName: "Henk",
    number: 11,
    onField: false,
    fieldSlotIndex: null,
    isKeeper: false,
    absent: false,
  },
];

const plans: PresentPlanRow[] = [
  {
    _id: "plan-0" as Id<"substitutionPlans">,
    matchId: "match-1" as Id<"matches">,
    sequence: 0,
    kind: "substitution",
    targetQuarter: 1,
    targetMinute: 10,
    playerOutId: "a" as Id<"players">,
    playerInId: "c" as Id<"players">,
    status: "pending",
    note: null,
    outDisplayName: "Piet",
    inDisplayName: "Henk",
  },
];

const matchId = "match-1" as Id<"matches">;

describe("PresentSubstitutionPlanView", () => {
  const mockAddPlanItem = vi.fn().mockResolvedValue("plan-new");
  const mockUpdatePlanItem = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockAddPlanItem.mockClear();
    mockUpdatePlanItem.mockClear();
    (
      mockUseMutation as unknown as {
        mockImplementation: (
          implementation: (mutationId: unknown) => unknown
        ) => void;
      }
    ).mockImplementation((mutationId: unknown) => {
      if (mutationId === api.substitutionPlans.addPlanItem) {
        return mockAddPlanItem;
      }
      if (mutationId === api.substitutionPlans.updatePlanItem) {
        return mockUpdatePlanItem;
      }
      return vi.fn().mockResolvedValue(undefined);
    });
  });

  it("shows numbered swaps in the sidebar and swaps the pitch on click", () => {
    render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          players={players}
          plans={plans}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    expect(screen.getByText("Piet 7 (CM) → Henk 11")).toBeTruthy();
    expect(screen.getByText("Beginopstelling")).toBeTruthy();
    expect(screen.getByText("Piet 7")).toBeTruthy();

    fireEvent.click(screen.getByText("Piet 7 (CM) → Henk 11"));

    expect(screen.getByText("Henk 11")).toBeTruthy();
    expect(screen.queryByText("Piet 7")).toBeNull();
  });

  it("labels bench substitutions and position changes apart", () => {
    const swap: PresentPlanRow = {
      ...plans[0]!,
      _id: "plan-1" as Id<"substitutionPlans">,
      sequence: 1,
      kind: "positionSwap",
      targetMinute: 20,
      playerOutId: "b" as Id<"players">,
      playerInId: "gk" as Id<"players">,
      outDisplayName: "Jan",
      inDisplayName: "Keeper",
    };

    render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          players={players}
          plans={[plans[0]!, swap]}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    expect(screen.getByText("Wissel")).toBeTruthy();
    expect(screen.getByText("Positiewissel")).toBeTruthy();
  });

  it("shows the empty state when there are no pending plans", () => {
    render(
      <PresentSubstitutionPlanView
        players={players}
        plans={[]}
        quarterCount={4}
        formationId={undefined}
        resolvedFormation={formation}
      />
    );

    expect(screen.getByText("Geen openstaande wissels")).toBeTruthy();
  });

  it("renders the half-perspective pitch when pitchLayout is half", () => {
    render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          players={players}
          plans={plans}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
          pitchLayout="halfPerspective"
        />
      </div>
    );

    expect(screen.getByTestId("half-pitch-plane")).toBeTruthy();
    expect(screen.getByText("Piet 7 (CM) → Henk 11")).toBeTruthy();
  });

  it("keeps the empty kickoff interactive when canEdit", () => {
    render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          matchId={matchId}
          canEdit
          players={players}
          plans={[]}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    expect(screen.queryByText("Geen openstaande wissels")).toBeNull();
    expect(screen.getByText("Begin")).toBeTruthy();
    expect(screen.getByText("Piet 7")).toBeTruthy();
    expect(screen.getByText(/Tik veldspeler/i)).toBeTruthy();
    expect(screen.getByText(/Wisselspelers/i)).toBeTruthy();
    expect(screen.getByLabelText("Min")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Zetten" })).toBeNull();
  });

  it("jumps to the planned moment after a Begin pitch swap", async () => {
    const { rerender } = render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          matchId={matchId}
          canEdit
          players={players}
          plans={[]}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    fireEvent.click(screen.getByText("Piet 7"));
    fireEvent.click(screen.getByText("Jan 10"));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalled();
    });

    const newPlan: PresentPlanRow = {
      _id: "plan-new" as Id<"substitutionPlans">,
      matchId,
      sequence: 0,
      kind: "positionSwap",
      targetQuarter: 1,
      targetMinute: null,
      playerOutId: "a" as Id<"players">,
      playerInId: "b" as Id<"players">,
      status: "pending",
      note: null,
      outDisplayName: "Piet",
      inDisplayName: "Jan",
    };

    rerender(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          matchId={matchId}
          canEdit
          players={players}
          plans={[newPlan]}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    // After the swap moment, Piet and Jan have exchanged slots — Jan is at CM.
    expect(screen.getByText("Jan 10")).toBeTruthy();
    expect(screen.getByText("Start kwart 1")).toBeTruthy();
  });

  it("plans a substitution from field then bench with moment timing", async () => {
    render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          matchId={matchId}
          canEdit
          players={players}
          plans={plans}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    // After the planned swap: Henk is on field, Piet on the bench.
    fireEvent.click(screen.getByText("Piet 7 (CM) → Henk 11"));
    fireEvent.click(screen.getByText("Jan 10"));
    fireEvent.click(screen.getByText("PIET"));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId,
          playerOutId: "b",
          playerInId: "a",
          targetQuarter: 1,
          targetMinute: 10,
          insertAtQuarterBoundary: false,
        })
      );
    });
  });

  it("plans a position swap between two field players", async () => {
    render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          matchId={matchId}
          canEdit
          players={players}
          plans={plans}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    fireEvent.click(screen.getByText("Begin"));
    fireEvent.click(screen.getByText("Piet 7"));
    fireEvent.click(screen.getByText("Jan 10"));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId,
          playerOutId: "a",
          playerInId: "b",
          kind: "positionSwap",
          targetQuarter: 1,
          insertAtQuarterBoundary: true,
        })
      );
    });
    expect(mockAddPlanItem.mock.calls[0]?.[0]).not.toHaveProperty(
      "targetMinute"
    );
  });

  it("applies a typed minute when planning from Begin", async () => {
    render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          matchId={matchId}
          canEdit
          players={players}
          plans={[]}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    fireEvent.change(screen.getByLabelText("Min"), { target: { value: "15" } });
    fireEvent.click(screen.getByText("Piet 7"));
    fireEvent.click(screen.getByText("Jan 10"));

    await waitFor(() => {
      expect(mockAddPlanItem).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId,
          playerOutId: "a",
          playerInId: "b",
          kind: "positionSwap",
          targetQuarter: 1,
          targetMinute: 15,
          insertAtQuarterBoundary: false,
        })
      );
    });
  });

  it("saves a typed minute onto the selected moment with Zetten", async () => {
    render(
      <div style={{ height: 600 }}>
        <PresentSubstitutionPlanView
          matchId={matchId}
          canEdit
          players={players}
          plans={plans}
          quarterCount={4}
          formationId="8v8_1-3-3-1"
          resolvedFormation={formation}
        />
      </div>
    );

    fireEvent.click(screen.getByText("Piet 7 (CM) → Henk 11"));
    fireEvent.change(screen.getByLabelText("Min"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Zetten" }));

    await waitFor(() => {
      expect(mockUpdatePlanItem).toHaveBeenCalledWith({
        planId: plans[0]!._id,
        targetMinute: 18,
      });
    });
  });
});
