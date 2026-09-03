import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TeamDeckGrid } from "./TeamDeckGrid";

const player = {
  playerId: "p1",
  displayName: "Jan Jansen",
  number: 10,
  positionPrimary: "ST",
  photoUrl: null,
  cardProfile: {
    xp: 120,
    level: 3,
    rarity: "rare" as const,
    seasonStats: {
      matches: 5,
      minutes: 180,
      goals: 3,
      assists: 1,
      cleanSheets: 0,
    },
    badges: ["top_scorer"],
  },
  showFullIdentity: true,
};

describe("TeamDeckGrid", () => {
  it("opens season detail when a card is clicked", () => {
    render(<TeamDeckGrid players={[player]} showMinutes />);

    fireEvent.click(screen.getByRole("button", { name: "Details Jan Jansen" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("180")).toBeInTheDocument();
    expect(screen.getByText("Doelpunten")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("hides minutes on the card for parents", () => {
    render(<TeamDeckGrid players={[player]} />);
    expect(screen.queryByText(/180 min/)).not.toBeInTheDocument();
  });

  it("closes the detail on Sluiten", () => {
    render(<TeamDeckGrid players={[player]} />);

    fireEvent.click(screen.getByRole("button", { name: "Details Jan Jansen" }));
    fireEvent.click(screen.getByRole("button", { name: "Sluiten detail" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
