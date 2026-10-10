import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Formation } from "@/lib/formations/types";
import {
  PresentationPitchView,
  type PresentationPlayer,
} from "./PresentationPitchView";

const formation: Formation = {
  name: "test",
  slots: [
    { id: 0, x: 50, y: 90, position: "GK" },
    { id: 7, x: 50, y: 20, position: "ST" },
  ],
  links: [],
};

const players: PresentationPlayer[] = [
  {
    playerId: "p0",
    displayName: "Keeper",
    number: 1,
    onField: true,
    fieldSlotIndex: 0,
  },
  {
    playerId: "p7",
    displayName: "Spits",
    number: 9,
    onField: true,
    fieldSlotIndex: 7,
  },
];

/** The positioned wrapper that carries the slot's left/top percentages. */
function cardAt(label: string): HTMLElement {
  const box = screen.getByText(label).closest<HTMLElement>("div.absolute");
  if (!box) throw new Error(`no positioned card found for "${label}"`);
  return box;
}

function pitchBox(container: HTMLElement): HTMLElement {
  const box = container.querySelector<HTMLElement>("[style*='aspect-ratio']");
  if (!box) throw new Error("no pitch frame rendered");
  return box;
}

describe("PresentationPitchView", () => {
  it("keeps the portrait pitch upright by default", () => {
    const { container } = render(
      <PresentationPitchView
        players={players}
        formationId={undefined}
        resolvedFormation={formation}
      />,
    );

    expect(pitchBox(container).style.aspectRatio).toBe("425 / 640");
    expect(cardAt("Keeper 1").style.top).toBe("90%");
    expect(cardAt("Spits 9").style.top).toBe("20%");
  });

  it("turns the pitch a quarter turn in landscape", () => {
    const { container } = render(
      <PresentationPitchView
        players={players}
        formationId={undefined}
        resolvedFormation={formation}
        orientation="landscape"
      />,
    );

    expect(pitchBox(container).style.aspectRatio).toBe("640 / 425");
    // Own goal left, attack right: the keeper trades his `y` for an `x`.
    expect(cardAt("Keeper 1").style.left).toBe("10%");
    expect(cardAt("Spits 9").style.left).toBe("80%");
    expect(cardAt("Keeper 1").style.top).toBe("50%");
  });

  it("rotates the field markings with the players", () => {
    const { container } = render(
      <PresentationPitchView
        players={players}
        formationId={undefined}
        resolvedFormation={formation}
        orientation="landscape"
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 640 425");
    expect(svg?.querySelector("g")?.getAttribute("transform")).toBe(
      "translate(640 0) rotate(90)",
    );
  });

  it("delegates to the half-perspective pitch", () => {
    render(
      <PresentationPitchView
        players={players}
        formationId={undefined}
        resolvedFormation={formation}
        pitchLayout="halfPerspective"
      />,
    );

    expect(screen.getByTestId("half-pitch-plane")).toBeTruthy();
    expect(screen.getByText("Keeper 1")).toBeTruthy();
  });
});
