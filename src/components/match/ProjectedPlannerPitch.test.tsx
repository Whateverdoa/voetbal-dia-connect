import { describe, expect, it, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { FIELDS } from "@/lib/fieldConfig";
import { TILT_DEG } from "@/lib/halfPitchLayout";
import type { MatchPlayer } from "./types";
import { ProjectedPlannerPitch } from "./ProjectedPlannerPitch";

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

const onField: MatchPlayer[] = [
  {
    matchPlayerId: "mp1" as Id<"matchPlayers">,
    playerId: "gk" as Id<"players">,
    name: "Keeper",
    number: 1,
    onField: true,
    isKeeper: true,
    fieldSlotIndex: 0,
  },
];

describe("ProjectedPlannerPitch", () => {
  it("renders the half-perspective pitch when layout is half", () => {
    render(
      <ProjectedPlannerPitch
        pitchLayout="halfPerspective"
        formation={formation}
        cfg={FIELDS["8tal"]}
        onField={onField}
        selectedPlayerId={null}
        canEdit
        pitchMaxWidthClass="max-w-lg"
        onFieldPlayerClick={() => undefined}
      />
    );

    const plane = screen.getByTestId("half-pitch-plane");
    expect(plane.style.transform).toContain(`rotateX(${TILT_DEG}deg)`);
    expect(screen.getByText("Keeper 1")).toBeTruthy();
  });
});
