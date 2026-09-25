import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefereeScoreFlow } from "./RefereeScoreFlow";
import type { Id } from "@/convex/_generated/dataModel";

const mockUseMutation = vi.mocked(useMutation);

describe("RefereeScoreFlow", () => {
  const adjustScore = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    (
      mockUseMutation as unknown as {
        mockImplementation: (fn: (ref: unknown) => unknown) => void;
      }
    ).mockImplementation((ref) =>
      ref === api.matchActions.adjustScore ? adjustScore : vi.fn(),
    );
  });

  it("links a regular goal to the typed shirt number", async () => {
    const withLoading = async (
      action: () => Promise<unknown>,
      onError: (message: string) => void,
    ) => {
      try {
        await action();
      } catch (error) {
        onError(error instanceof Error ? error.message : "fout");
      }
    };

    render(
      <RefereeScoreFlow
        matchId={"m1" as Id<"matches">}
        homeName="DIA JO13-1"
        awayName="VOAB"
        homeScore={0}
        awayScore={0}
        isLoading={false}
        scoreError={null}
        canRecord
        cardControls={null}
        withLoading={withLoading}
        onScoreError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "DIA JO13-1 score +1" }));
    fireEvent.change(screen.getByPlaceholderText("bijv. 7"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));

    await waitFor(() => {
      expect(adjustScore).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "m1",
          team: "home",
          delta: 1,
          scorerNumber: 9,
        }),
      );
    });
  });

  it("registers an own goal as extra score for the other team", async () => {
    const withLoading = async (
      action: () => Promise<unknown>,
      onError: (message: string) => void,
    ) => {
      try {
        await action();
      } catch (error) {
        onError(error instanceof Error ? error.message : "fout");
      }
    };

    render(
      <RefereeScoreFlow
        matchId={"m1" as Id<"matches">}
        homeName="DIA JO13-1"
        awayName="VOAB"
        homeScore={0}
        awayScore={0}
        isLoading={false}
        scoreError={null}
        canRecord
        cardControls={null}
        withLoading={withLoading}
        onScoreError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eigen doelpunt" }));
    fireEvent.click(screen.getByRole("button", { name: "DIA JO13-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));

    await waitFor(() => {
      expect(adjustScore).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "m1",
          team: "away",
          delta: 1,
          isOwnGoal: true,
        }),
      );
    });
  });
});
