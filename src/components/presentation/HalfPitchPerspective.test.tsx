import { describe, expect, it, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Formation } from "@/lib/formations/types";
import { FIELDS } from "@/lib/fieldConfig";
import { TILT_DEG } from "@/lib/halfPitchLayout";
import { HalfPitchPerspective } from "./HalfPitchPerspective";

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
    { id: 7, x: 50, y: 20, position: "ST" },
  ],
  links: [],
};

const players = [
  {
    playerId: "gk",
    displayName: "Keeper",
    number: 1,
    onField: true,
    fieldSlotIndex: 0,
  },
  {
    playerId: "st",
    displayName: "Spits",
    number: 9,
    onField: true,
    fieldSlotIndex: 7,
  },
];

describe("HalfPitchPerspective", () => {
  it("tilts the grass plane and counter-rotates each card", () => {
    const { container } = render(
      <HalfPitchPerspective
        players={players}
        formation={formation}
        cfg={FIELDS["8tal"]}
      />
    );

    const plane = screen.getByTestId("half-pitch-plane");
    expect(plane.style.transform).toContain(`rotateX(${TILT_DEG}deg)`);

    expect(screen.getByText("Keeper 1")).toBeTruthy();
    expect(screen.getByText("Spits 9")).toBeTruthy();

    const card = screen
      .getByText("Keeper 1")
      .closest<HTMLElement>("div.absolute");
    expect(card?.style.transform).toContain(`rotateX(${-TILT_DEG}deg)`);
    expect(card?.style.transform).toContain("translateZ(");
    expect(card?.style.transformStyle).toBe("preserve-3d");

    const svg = container.querySelector("svg");
    const cfg = FIELDS["8tal"];
    expect(svg?.getAttribute("viewBox")).toBe(
      `0 ${cfg.h / 2} ${cfg.w} ${cfg.h / 2}`
    );
  });
});
