import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CardModal } from "./CardModal";
import type { CardModalPlayer } from "./CardModal";
import type { Id } from "@/convex/_generated/dataModel";

const mockUseMutation = vi.mocked(useMutation);

describe("CardModal", () => {
  const addCard = vi.fn().mockResolvedValue({
    eventType: "yellow_card",
    note: "gele kaart · tijdstraf 5 min",
    secondYellow: false,
    isOpponentCard: false,
  });
  const onClose = vi.fn();
  const players: CardModalPlayer[] = [
    {
      playerId: "p1" as Id<"players">,
      name: "Jan",
      number: 10,
      onField: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (
      mockUseMutation as unknown as {
        mockImplementation: (fn: (ref: unknown) => unknown) => void;
      }
    ).mockImplementation((ref) =>
      ref === api.matchActions.addCard ? addCard : vi.fn(),
    );
  });

  it("lets a referee save a card without name or roster", async () => {
    render(
      <CardModal
        matchId={"m1" as Id<"matches">}
        players={players}
        skipNames
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gele kaart · DIA/ }));
    expect(screen.queryByPlaceholderText("Naam")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /10\. Jan/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));

    await waitFor(() => {
      expect(addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "m1",
          cardType: "yellow_card",
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("registers a yellow card for the selected player", async () => {
    render(
      <CardModal
        matchId={"m1" as Id<"matches">}
        players={players}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gele kaart · DIA/ }));
    fireEvent.click(screen.getByRole("button", { name: /10\. Jan/ }));
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));

    await waitFor(() => {
      expect(addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "m1",
          playerId: "p1",
          cardType: "yellow_card",
          reportedName: "Jan",
          reportedNumber: 10,
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("registers a DIA card by shirt number only", async () => {
    render(
      <CardModal
        matchId={"m1" as Id<"matches">}
        players={players}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gele kaart · DIA/ }));
    fireEvent.change(screen.getByPlaceholderText("#"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));

    await waitFor(() => {
      expect(addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "m1",
          cardType: "yellow_card",
          reportedNumber: 9,
        }),
      );
    });
  });

  it("registers an opponent yellow card after optional identity", async () => {
    render(
      <CardModal
        matchId={"m1" as Id<"matches">}
        players={players}
        opponentName="VOAB"
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Geel · VOAB/ }));
    fireEvent.change(screen.getByPlaceholderText("#"), { target: { value: "4" } });
    fireEvent.change(screen.getByPlaceholderText("Naam"), {
      target: { value: "Vos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));

    await waitFor(() => {
      expect(addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "m1",
          cardType: "yellow_card",
          isOpponentCard: true,
          reportedNumber: 4,
          reportedName: "Vos",
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
