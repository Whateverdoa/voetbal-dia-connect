import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import { StagedSubstitutionsPanel } from "./StagedSubstitutionsPanel";

const mockUseMutation = vi.mocked(useMutation);

describe("StagedSubstitutionsPanel", () => {
  const defaultMatchId = "match123" as any;
  const defaultPin = "1234";
  const mockConfirmSubstitution = vi.fn();
  const mockCancelStagedSubstitution = vi.fn();

  const stagedItems = [
    {
      stagedEventId: "stage1" as any,
      outId: "p1" as any,
      inId: "p2" as any,
      outName: "Jan",
      inName: "Piet",
      quarter: 2,
      createdAt: 1000,
    },
    {
      stagedEventId: "stage2" as any,
      outId: "p3" as any,
      inId: "p4" as any,
      outName: "Klaas",
      inName: "Dirk",
      quarter: 2,
      createdAt: 2000,
    },
    {
      stagedEventId: "stage3" as any,
      outId: "p5" as any,
      inId: "p6" as any,
      outName: "Bas",
      inName: "Henk",
      quarter: 3,
      createdAt: 3000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationMap: Record<string, ReturnType<typeof vi.fn>> = {
      "matchActions:confirmSubstitution": mockConfirmSubstitution,
      "matchActions:cancelStagedSubstitution": mockCancelStagedSubstitution,
    };
    (mockUseMutation as any).mockImplementation((ref: any) => {
      return mutationMap[ref as string] ?? vi.fn();
    });
    mockConfirmSubstitution.mockResolvedValue({});
    mockCancelStagedSubstitution.mockResolvedValue({});
  });

  it("renders empty state when there are no staged substitutions", () => {
    render(
      <StagedSubstitutionsPanel
        matchId={defaultMatchId}
        pin={defaultPin}
        stagedSubstitutions={[]}
      />
    );

    expect(screen.getByText("Staged wissels")).toBeInTheDocument();
    expect(screen.getByText("Geen staged wissels.")).toBeInTheDocument();
  });

  it("renders staged substitutions with player names", () => {
    render(
      <StagedSubstitutionsPanel
        matchId={defaultMatchId}
        pin={defaultPin}
        stagedSubstitutions={stagedItems.slice(0, 2)}
      />
    );

    expect(screen.getByText("Jan -> Piet")).toBeInTheDocument();
    expect(screen.getByText("Klaas -> Dirk")).toBeInTheDocument();
  });

  it("confirms a staged substitution", async () => {
    render(
      <StagedSubstitutionsPanel
        matchId={defaultMatchId}
        pin={defaultPin}
        stagedSubstitutions={stagedItems.slice(0, 1)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Bevestig" }));

    await waitFor(() => {
      expect(mockConfirmSubstitution).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: defaultMatchId,
          pin: defaultPin,
          stagedEventId: "stage1",
          correlationId: expect.any(String),
        })
      );
    });
  });

  it("cancels a staged substitution", async () => {
    render(
      <StagedSubstitutionsPanel
        matchId={defaultMatchId}
        pin={defaultPin}
        stagedSubstitutions={stagedItems.slice(0, 1)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Annuleer" }));

    await waitFor(() => {
      expect(mockCancelStagedSubstitution).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: defaultMatchId,
          pin: defaultPin,
          stagedEventId: "stage1",
          correlationId: expect.any(String),
        })
      );
    });
  });

  it("shows clear error text when single confirm fails", async () => {
    mockConfirmSubstitution.mockRejectedValueOnce(
      new Error(
        "Wissel niet meer geldig: speler die erin moet is niet beschikbaar op de bank"
      )
    );

    render(
      <StagedSubstitutionsPanel
        matchId={defaultMatchId}
        pin={defaultPin}
        stagedSubstitutions={stagedItems.slice(0, 1)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Bevestig" }));

    expect(
      await screen.findByText(
        /Bevestigen mislukt: Wissel niet meer geldig: speler die erin moet is niet beschikbaar op de bank/
      )
    ).toBeInTheDocument();
  });

  it("batch confirm stops at first failure", async () => {
    mockConfirmSubstitution
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Deze staged wissel is al geannuleerd"))
      .mockResolvedValueOnce({});

    render(
      <StagedSubstitutionsPanel
        matchId={defaultMatchId}
        pin={defaultPin}
        stagedSubstitutions={stagedItems}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Bevestig alles" }));

    await waitFor(() => {
      expect(mockConfirmSubstitution).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByText(
        /Batch gestopt bij Klaas -> Dirk: Deze staged wissel is al geannuleerd/
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "1 staged wissel(s) bevestigd voordat de batch stopte."
      )
    ).toBeInTheDocument();
  });
});
