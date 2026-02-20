import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PitchView } from "./PitchView";
import type { MatchPlayer } from "./types";

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

describe("PitchView", () => {
  const matchId = "match123" as any;
  const pin = "1234";
  const formationId = "8v8_1-3-3-1";

  const playerOnField1: MatchPlayer = {
    matchPlayerId: "mp1" as any,
    playerId: "p1" as any,
    name: "Jan",
    number: 10,
    onField: true,
    isKeeper: false,
    fieldSlotIndex: 1,
  };

  const playerOnField2: MatchPlayer = {
    matchPlayerId: "mp2" as any,
    playerId: "p2" as any,
    name: "Piet",
    number: 7,
    onField: true,
    isKeeper: false,
    fieldSlotIndex: 2,
  };

  const playerOnBench: MatchPlayer = {
    matchPlayerId: "mp3" as any,
    playerId: "p3" as any,
    name: "Henk",
    number: 11,
    onField: false,
    isKeeper: false,
  };

  const keeper: MatchPlayer = {
    matchPlayerId: "mpk" as any,
    playerId: "pk" as any,
    name: "Keeper",
    number: 1,
    onField: true,
    isKeeper: true,
    fieldSlotIndex: 0,
  };

  const players: MatchPlayer[] = [
    keeper,
    playerOnField1,
    playerOnField2,
    playerOnBench,
  ];

  const mockAssign = vi.fn().mockResolvedValue(undefined);
  const mockToggle = vi.fn().mockResolvedValue(undefined);
  const mockSwap = vi.fn().mockResolvedValue(undefined);
  const mockSubstituteFromField = vi.fn().mockResolvedValue(undefined);

  function setupMocks() {
    mockUseMutation.mockImplementation((mutationId: string) => {
      if (mutationId === api.matchActions.assignPlayerToSlot) return mockAssign;
      if (mutationId === api.matchActions.togglePlayerOnField) return mockToggle;
      if (mutationId === api.matchActions.swapFieldPositions) return mockSwap;
      if (mutationId === api.matchActions.substituteFromField) return mockSubstituteFromField;
      return vi.fn().mockResolvedValue(undefined);
    });
  }

  function renderPitchView(status: "live" | "scheduled" = "live") {
    return render(
      <PitchView
        matchId={matchId}
        pin={pin}
        players={players}
        formationId={formationId}
        status={status}
        canEdit={true}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  describe("bench ↔ field substitution (live)", () => {
    it("calls substituteFromField when bench player selected then field player clicked", () => {
      renderPitchView("live");

      fireEvent.click(screen.getByText("HENK"));
      fireEvent.click(screen.getByText("JAN"));

      expect(mockSubstituteFromField).toHaveBeenCalledWith({
        matchId,
        pin,
        playerOutId: "p1",
        playerInId: "p3",
      });
      expect(mockAssign).not.toHaveBeenCalled();
      expect(mockToggle).not.toHaveBeenCalled();
    });

    it("calls substituteFromField when field player selected then bench player clicked", () => {
      renderPitchView("live");

      fireEvent.click(screen.getByText("JAN"));
      fireEvent.click(screen.getByText("HENK"));

      expect(mockSubstituteFromField).toHaveBeenCalledWith({
        matchId,
        pin,
        playerOutId: "p1",
        playerInId: "p3",
      });
      expect(mockAssign).not.toHaveBeenCalled();
      expect(mockToggle).not.toHaveBeenCalled();
    });
  });

  describe("on-field position swap", () => {
    it("calls swapFieldPositions when two field players selected", () => {
      renderPitchView("live");

      fireEvent.click(screen.getByText("JAN"));
      fireEvent.click(screen.getByText("PIET"));

      expect(mockSwap).toHaveBeenCalledWith({
        matchId,
        pin,
        playerAId: "p1",
        playerBId: "p2",
      });
      expect(mockSubstituteFromField).not.toHaveBeenCalled();
    });
  });

  describe("pre-game (scheduled) — no event logging", () => {
    it("calls assignPlayerToSlot and togglePlayerOnField when bench→field in pre-game", () => {
      renderPitchView("scheduled");

      fireEvent.click(screen.getByText("HENK"));
      fireEvent.click(screen.getByText("JAN"));

      expect(mockAssign).toHaveBeenCalledWith({
        matchId,
        pin,
        playerId: "p3",
        fieldSlotIndex: 1,
      });
      expect(mockToggle).toHaveBeenCalledWith({
        matchId,
        pin,
        playerId: "p1",
      });
      expect(mockSubstituteFromField).not.toHaveBeenCalled();
    });
  });
});
