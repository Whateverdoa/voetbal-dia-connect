import type { ComponentProps } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RefereeMatchConsole } from "./RefereeMatchConsole";

vi.mock("./RefereeMatchHeader", () => ({ RefereeMatchHeader: () => null }));
vi.mock("./RefereeScoreFlow", () => ({ RefereeScoreFlow: () => null }));
vi.mock("./RefereeCardControls", () => ({ RefereeCardControls: () => null }));
vi.mock("@/components/match/EventTimeline", () => ({ EventTimeline: () => null }));

const props: ComponentProps<typeof RefereeMatchConsole> = {
  matchId: "match1" as Id<"matches">,
  status: "live",
  currentQuarter: 1,
  quarterCount: 2,
  useBreakClock: false,
  homeScore: 0,
  awayScore: 0,
  homeName: "DIA",
  awayName: "VOAB",
  homeLogoUrl: null,
  awayLogoUrl: null,
  diaTeamSide: "home",
  diaPlayers: [],
};

describe("referee period-end protection", () => {
  const nextQuarter = vi.fn<() => Promise<unknown>>();
  const otherMutation = vi.fn<() => Promise<unknown>>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    nextQuarter.mockResolvedValue(undefined);
    otherMutation.mockResolvedValue(undefined);
    vi.mocked(useMutation).mockImplementation(
      (reference) =>
        (reference === api.matchActions.nextQuarter
          ? nextQuarter
          : otherMutation) as unknown as ReturnType<typeof useMutation>,
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([
    { quarterCount: 2, currentQuarter: 1, button: "Einde helft 1", question: "Wil je helft 1 beëindigen?" },
    { quarterCount: 4, currentQuarter: 1, button: "Einde kwart 1", question: "Wil je kwart 1 beëindigen?" },
    { quarterCount: 4, currentQuarter: 2, button: "Einde kwart 2", question: "Wil je kwart 2 beëindigen?" },
    { quarterCount: 4, currentQuarter: 3, button: "Einde kwart 3", question: "Wil je kwart 3 beëindigen?" },
    { quarterCount: 2, currentQuarter: 2, button: "Einde match", question: "Is de wedstrijd echt afgelopen?" },
    { quarterCount: 4, currentQuarter: 4, button: "Einde match", question: "Is de wedstrijd echt afgelopen?" },
  ])("requires a deliberate confirmation for $button ($currentQuarter/$quarterCount)", async ({ quarterCount, currentQuarter, button, question }) => {
    render(<RefereeMatchConsole {...props} quarterCount={quarterCount} currentQuarter={currentQuarter} />);

    fireEvent.click(screen.getByRole("button", { name: button }));

    expect(screen.getByRole("alert")).toHaveTextContent(question);
    expect(screen.getByRole("button", { name: "Annuleren" })).toHaveFocus();
    expect(nextQuarter).not.toHaveBeenCalled();
    expect(otherMutation).not.toHaveBeenCalled();

    const confirm = screen.getByRole("button", { name: "Ja, beëindigen" });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(nextQuarter).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(600));
    expect(confirm).toBeEnabled();
    await act(async () => { fireEvent.click(confirm); });

    expect(nextQuarter).toHaveBeenCalledExactlyOnceWith({
      matchId: props.matchId,
      correlationId: expect.any(String),
    });
    expect(otherMutation).not.toHaveBeenCalled();
  });

  it("allows an accidental tap to be cancelled without stopping the clock", () => {
    render(<RefereeMatchConsole {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Einde helft 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuleren" }));

    expect(screen.getByRole("button", { name: "Einde helft 1" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Ja, beëindigen" })).not.toBeInTheDocument();
    expect(nextQuarter).not.toHaveBeenCalled();
    expect(otherMutation).not.toHaveBeenCalled();
  });

  it("expires an unanswered confirmation and protects the next attempt too", () => {
    render(<RefereeMatchConsole {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Einde helft 1" }));
    act(() => vi.advanceTimersByTime(5000));

    expect(screen.queryByRole("button", { name: "Ja, beëindigen" })).not.toBeInTheDocument();
    expect(nextQuarter).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Einde helft 1" }));
    expect(screen.getByRole("button", { name: "Ja, beëindigen" })).toBeDisabled();
  });

  it.each([
    { update: { status: "halftime" as const, currentQuarter: 2 }, nextButton: "Start helft 2" },
    { update: { currentQuarter: 2 }, nextButton: "Einde match" },
    { update: { matchId: "match2" as Id<"matches"> }, nextButton: "Einde helft 1" },
    { update: { quarterCount: 4 }, nextButton: "Einde kwart 1" },
  ])("discards confirmation when the match context changes to $nextButton", ({ update, nextButton }) => {
    const { rerender } = render(<RefereeMatchConsole {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Einde helft 1" }));
    act(() => vi.advanceTimersByTime(600));

    rerender(<RefereeMatchConsole {...props} {...update} />);

    expect(screen.queryByRole("button", { name: "Ja, beëindigen" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: nextButton })).toBeEnabled();
    expect(nextQuarter).not.toHaveBeenCalled();
  });

  it("blocks additional requests while ending the period", async () => {
    const pending = Promise.withResolvers<unknown>();
    nextQuarter.mockReturnValueOnce(pending.promise);
    render(<RefereeMatchConsole {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Einde helft 1" }));
    act(() => vi.advanceTimersByTime(600));
    fireEvent.click(screen.getByRole("button", { name: "Ja, beëindigen" }));

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(nextQuarter).toHaveBeenCalledTimes(1);

    await act(async () => { pending.resolve(undefined); });
  });
});
