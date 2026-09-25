import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { getFormation } from "@/lib/formations";
import { SubstitutionPlannerStudio } from "./SubstitutionPlannerStudio";
import type { MatchPlayer } from "@/components/match/types";

vi.mock("@/hooks/useSeasonMinutesMap", () => ({
  useSeasonMinutesMap: () => new Map(),
}));

vi.mock("@/hooks/useShowCardMinutes", () => ({
  useShowCardMinutes: () => [true, vi.fn()],
}));

vi.mock("@/components/match/FormationSelector", () => ({
  FormationSelector: () =>
    require("react").createElement("label", null, "Formatie"),
}));

vi.mocked(useMutation);

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

describe("SubstitutionPlannerStudio", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReturnValue(
      Object.assign(vi.fn().mockResolvedValue(undefined), {
        withOptimisticUpdate: vi.fn(),
      })
    );
  });

  it("uses the presentation shell so the pitch can fill the screen", () => {
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
    ];

    const { container } = render(
      <SubstitutionPlannerStudio
        matchId={"match1" as Id<"matches">}
        teamId={"team1" as Id<"teams">}
        publicCode="ABC123"
        teamName="JO13-2"
        opponent="TSC"
        status="lineup"
        quarterCount={2}
        plans={[]}
        players={players}
        resolvedFormation={getFormation("8v8_1-3-3-1")}
        canEditPlan
        canExecute={false}
      />
    );

    expect(screen.getByText("Plannen · tik op het veld")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vol veld" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Half veld" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Presenteren" })).toHaveAttribute(
      "href",
      "/present/match/ABC123/kleedkamer?tab=opstelling"
    );
    const box = container.querySelector<HTMLElement>("[style*='aspect-ratio']");
    expect(box?.style.aspectRatio).toBe("640 / 425");
  });
});
