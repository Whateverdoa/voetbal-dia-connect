import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CardModal } from "./CardModal";
import type { MatchPlayer } from "./types";
import type { Id } from "@/convex/_generated/dataModel";

const mockUseMutation = vi.mocked(useMutation);

describe("CardModal", () => {
  const addCard = vi.fn().mockResolvedValue({
    eventType: "yellow_card",
    note: "gele kaart · tijdstraf 5 min",
    secondYellow: false,
  });
  const onClose = vi.fn();
  const players: MatchPlayer[] = [
    {
      matchPlayerId: "mp1" as Id<"matchPlayers">,
      playerId: "p1" as Id<"players">,
      name: "Jan",
      number: 10,
      onField: true,
      isKeeper: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (
      mockUseMutation as unknown as {
        mockImplementation: (fn: (ref: unknown) => unknown) => void;
      }
    ).mockImplementation((ref) =>
      ref === api.matchActions.addCard ? addCard : vi.fn()
    );
  });

  it("registers a yellow card for the selected player", async () => {
    render(
      <CardModal
        matchId={"m1" as Id<"matches">}
        players={players}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Gele kaart \(eigen team\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /10\. Jan/ }));
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));

    await waitFor(() => {
      expect(addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "m1",
          playerId: "p1",
          cardType: "yellow_card",
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("registers an opponent yellow card immediately", async () => {
    render(
      <CardModal
        matchId={"m1" as Id<"matches">}
        players={players}
        opponentName="VOAB"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Geel · VOAB/ }));

    await waitFor(() => {
      expect(addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "m1",
          cardType: "yellow_card",
          isOpponentCard: true,
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
