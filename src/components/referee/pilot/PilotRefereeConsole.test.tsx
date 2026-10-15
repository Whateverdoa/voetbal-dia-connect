import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import type { RefereeDetail } from "@/lib/refereePilot";
import { PilotRefereeConsole } from "./PilotRefereeConsole";
vi.mock("convex/react", () => ({ useQuery: vi.fn(), useMutation: vi.fn(), usePaginatedQuery: vi.fn() }));
vi.mock("@/lib/matchClock/clockSignals", () => ({ signalQuarterNominalEnd: vi.fn() }));
const matchId = "local-match" as Id<"matches">;
const mutate = vi.fn();
let match: RefereeDetail;
beforeEach(() => {
  vi.clearAllMocks();
  match = { actorSubject: "ref", apiVersion: 1, clockPolicyVersion: 1, writesEnabled: true, matchId, teamId: "team" as Id<"teams">,
    teamName: "Local", opponent: "Opponent", isHome: true, status: "live", homeScore: 0, awayScore: 0,
    period: 1, periodCount: 2, periodMinutes: 30, controller: "referee", eligibleToControl: true, canControl: true,
    canAnnotate: true, expiresAt: 0, version: 1, serverNow: Date.now(), clockGuardPending: false,
    clock: { elapsedMs: 0, runningSince: Date.now(), safetyMarginMinutes: 10, confirmedStoppageMs: 0,
      periodStartedElapsedMs: 0, clockLimitElapsedMs: 40 * 60_000, clockLimitAt: Date.now() + 40 * 60_000, regularTimeReached: false },
    players: [{ playerId: "player" as Id<"players">, name: "Scorer", number: 7 }] };
  vi.mocked(useQuery).mockImplementation(() => match);
  vi.mocked(useMutation).mockReturnValue(Object.assign(mutate, { withOptimisticUpdate: () => mutate }) as unknown as ReturnType<typeof useMutation>);
  vi.mocked(usePaginatedQuery).mockReturnValue({ results: [], status: "Exhausted", loadMore: vi.fn(), isLoading: false });
  mutate.mockImplementation(async args => ({ commandEventId: "event", commandCorrelationId: args.correlationId, version: args.expectedVersion + 1 }));
});
afterEach(() => vi.restoreAllMocks());
it("records a goal before optional scorer choice; skip never undoes it", async () => {
  render(<PilotRefereeConsole matchId={matchId} />);
  fireEvent.click(screen.getByRole("button", { name: "Doelpunt thuis" }));
  await screen.findByRole("dialog", { name: "Gegevens aanvullen" });
  expect(mutate.mock.calls[0][0]).toMatchObject({ matchId, expectedVersion: 1, action: { kind: "goal", team: "home" } });
  expect(mutate.mock.calls[0][0].action).not.toHaveProperty("scorerId");
  fireEvent.click(screen.getByRole("button", { name: "Overslaan" }));
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(getFunctionName(vi.mocked(useMutation).mock.calls[0][0])).toBe("refereeRegistration:command");
});
it("uncertain confirmation retries exactly the same command and never calls a legacy route", async () => {
  mutate.mockRejectedValueOnce(new Error("Connection lost"));
  render(<PilotRefereeConsole matchId={matchId} />);
  fireEvent.click(screen.getByRole("button", { name: "Doelpunt thuis" }));
  await screen.findByText(/Bevestiging ontbreekt/);
  const args = mutate.mock.calls[0][0];
  fireEvent.click(screen.getByRole("button", { name: "Dezelfde actie opnieuw versturen" }));
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
  expect(mutate.mock.calls[1][0]).toEqual(args);
  expect(vi.mocked(useMutation).mock.calls.every(([ref]) => getFunctionName(ref) === "refereeRegistration:command")).toBe(true);
});
it("read-only admin view and offline view cannot write", () => {
  match = { ...match, canControl: false, canAnnotate: false };
  const view = render(<PilotRefereeConsole matchId={matchId} />);
  expect(screen.getByRole("button", { name: "Doelpunt thuis" })).toBeDisabled();
  match = { ...match, canControl: true, canAnnotate: true };
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  fireEvent(window, new Event("offline")); view.rerender(<PilotRefereeConsole matchId={matchId} />);
  expect(screen.getByRole("button", { name: "Doelpunt thuis" })).toBeDisabled();
  expect(mutate).not.toHaveBeenCalled();
});
it("a long pause needs an explicit decision before resume", async () => {
  match.clock = { ...match.clock!, runningSince: null, stoppageStartedAt: Date.now() - 16 * 60_000, elapsedMs: 5 * 60_000 };
  render(<PilotRefereeConsole matchId={matchId} />);
  fireEvent.click(screen.getByRole("button", { name: "Hervat klok" }));
  expect(screen.getByRole("dialog", { name: "Onderbreking beoordelen" })).toBeInTheDocument();
  expect(mutate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Onderbreking niet meetellen" }));
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  expect(mutate.mock.calls[0][0]).toMatchObject({ expectedVersion: 2, action: { kind: "resume", stoppageDisposition: "discard" } });
});
it("zero margin is rendered as zero, not the default ten", () => {
  match.clock!.safetyMarginMinutes = 0;
  render(<PilotRefereeConsole matchId={matchId} />);
  expect(screen.getByRole("spinbutton", { name: "Veiligheidsmarge", hidden: true })).toHaveValue(0);
});
it("after halftime the next-period command is explicit and does not restart the match", async () => {
  match = { ...match, status: "halftime" }; match.clock!.runningSince = null;
  render(<PilotRefereeConsole matchId={matchId} />);
  fireEvent.click(screen.getByRole("button", { name: "Start volgende helft" }));
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  expect(mutate.mock.calls[0][0].action).toEqual({ kind: "start_period" });
});
