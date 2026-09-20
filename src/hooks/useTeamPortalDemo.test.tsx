import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoState } from "@/lib/team-portal/fixtures";
import { getPublishedFeedback, getWinners } from "@/lib/team-portal/selectors";
import { DEMO_STORAGE_KEY, parseSavedDemo } from "@/lib/team-portal/storage";
import { useTeamPortalDemo } from "./useTeamPortalDemo";

const NOW = 1800000000000;
const actionVote = { type: "castVote", matchId: "m2", kind: "highlight", targetId: "h3" } as const;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("team portal browser persistence", () => {
  it("initializes a usable demo and stores the dated fixtures on the first visit", () => {
    const { result } = renderHook(() => useTeamPortalDemo());

    expect(result.current.ready).toBe(true);
    expect(result.current.now).toBe(NOW);
    expect(result.current.state).toEqual(createDemoState(NOW));
    expect(parseSavedDemo(window.localStorage.getItem(DEMO_STORAGE_KEY))).toEqual(result.current.state);
    expect(result.current.storageWarning).toBe("");
  });

  it("loads saved edits before any write, including Strict Mode hydration", () => {
    const saved = createDemoState(NOW - 3600000);
    saved.feedback[0].draft.compliment = "Je hielp je teamgenoot rustig verder.";
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(saved));
    const reads = vi.spyOn(Storage.prototype, "getItem");
    const writes = vi.spyOn(Storage.prototype, "setItem");

    const { result } = renderHook(() => useTeamPortalDemo(), { wrapper: StrictMode });

    expect(result.current.state).toEqual(saved);
    expect(writes).toHaveBeenCalled();
    expect(reads.mock.invocationCallOrder[0]).toBeLessThan(writes.mock.invocationCallOrder[0]);
    for (const [key, value] of writes.mock.calls) {
      expect(key).toBe(DEMO_STORAGE_KEY);
      expect(parseSavedDemo(value)).toEqual(saved);
    }
  });

  it("persists commands across remounts and resets only the demo storage", () => {
    window.localStorage.setItem("unrelated-setting", "keep-me");
    const first = renderHook(() => useTeamPortalDemo());
    act(() => { expect(first.result.current.run(actionVote)).toBe(true); });
    const voted = first.result.current.state;
    first.unmount();

    const reloaded = renderHook(() => useTeamPortalDemo());
    expect(reloaded.result.current.state).toEqual(voted);
    expect(reloaded.result.current.state.votes).toContainEqual({
      matchId: "m2", voterId: "p1", kind: "highlight", targetId: "h3",
    });

    act(() => { reloaded.result.current.setActor({ role: "coach" }); });
    vi.setSystemTime(NOW + 60000);
    act(() => { reloaded.result.current.reset(); });
    expect(reloaded.result.current.state).toEqual(createDemoState(NOW + 60000));
    expect(reloaded.result.current.actor).toEqual({ role: "player", playerId: "p1" });
    expect(parseSavedDemo(window.localStorage.getItem(DEMO_STORAGE_KEY))).toEqual(reloaded.result.current.state);
    expect(window.localStorage.getItem("unrelated-setting")).toBe("keep-me");
    expect(reloaded.result.current.notice).toMatchObject({ error: false });
    reloaded.unmount();

    const afterReset = renderHook(() => useTeamPortalDemo());
    expect(afterReset.result.current.state).toEqual(createDemoState(NOW + 60000));
  });

  it.each(["{broken-json", JSON.stringify({ version: 99 })])(
    "recovers invalid storage (%s) with a notice and valid fixtures",
    (raw) => {
      window.localStorage.setItem(DEMO_STORAGE_KEY, raw);
      const { result } = renderHook(() => useTeamPortalDemo());

      expect(result.current.ready).toBe(true);
      expect(result.current.state).toEqual(createDemoState(NOW));
      expect(result.current.storageWarning).toContain("voorbeelden hersteld");
      expect(parseSavedDemo(window.localStorage.getItem(DEMO_STORAGE_KEY))).toEqual(result.current.state);
    }
  );

  it("remains interactive when the browser denies access to localStorage", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    const { result } = renderHook(() => useTeamPortalDemo());

    expect(result.current.ready).toBe(true);
    expect(result.current.storageWarning).toContain("browser bewaart deze demo niet");
    act(() => { expect(result.current.run(actionVote)).toBe(true); });
    expect(result.current.state.votes).toContainEqual({
      matchId: "m2", voterId: "p1", kind: "highlight", targetId: "h3",
    });
    expect(result.current.notice).toMatchObject({ error: false });
  });

  it("retains loaded data and new in-memory edits when storage is full", () => {
    const saved = createDemoState(NOW - 3600000);
    saved.feedback[0].draft.compliment = "Je bleef goed samenspelen.";
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(saved));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });
    const { result } = renderHook(() => useTeamPortalDemo());

    expect(result.current.state).toEqual(saved);
    act(() => { expect(result.current.run(actionVote)).toBe(true); });
    expect(result.current.state.votes).toHaveLength(saved.votes.length + 1);
    expect(result.current.storageWarning).toContain("browser bewaart deze demo niet");
    expect(parseSavedDemo(window.localStorage.getItem(DEMO_STORAGE_KEY))).toEqual(saved);
  });
});

describe("team portal command sequencing", () => {
  it("keeps both vote categories and only the latest choice during rapid commands", () => {
    const { result } = renderHook(() => useTeamPortalDemo());
    const vote = { type: "castVote", matchId: "m2", kind: "player", targetId: "p2", reason: "Hielp het team" } as const;

    act(() => {
      expect(result.current.run(vote)).toBe(true);
      expect(result.current.run(vote)).toBe(true);
      expect(result.current.run({ ...vote, targetId: "p5" })).toBe(true);
      expect(result.current.run(actionVote)).toBe(true);
      expect(result.current.run({ ...vote, targetId: "p1" })).toBe(false);
    });

    expect(result.current.state.votes.filter((item) => item.matchId === "m2" && item.voterId === "p1")).toEqual([
      { matchId: "m2", voterId: "p1", kind: "player", targetId: "p5", reason: "Hielp het team" },
      { matchId: "m2", voterId: "p1", kind: "highlight", targetId: "h3" },
    ]);
    expect(result.current.notice).toMatchObject({ error: true });
    expect(parseSavedDemo(window.localStorage.getItem(DEMO_STORAGE_KEY))).toEqual(result.current.state);
  });

  it("carries coach approval, publication and player voting through to saved results", () => {
    const { result } = renderHook(() => useTeamPortalDemo());
    act(() => { result.current.setActor({ role: "coach" }); });
    act(() => {
      expect(result.current.run({ type: "reviewHighlight", highlightId: "h2", approved: true })).toBe(true);
      expect(result.current.run({ type: "publishFeedback", feedbackId: "f3" })).toBe(true);
      expect(result.current.run({ type: "openVoting", matchId: "m1" })).toBe(true);
    });

    act(() => { result.current.setActor({ role: "parent", guardianId: "family1" }); });
    expect(getPublishedFeedback(result.current.state, result.current.actor, "p10")).toHaveLength(1);
    expect(getPublishedFeedback(result.current.state, result.current.actor, "p2")).toEqual([]);
    act(() => { expect(result.current.run(actionVote)).toBe(false); });

    act(() => { result.current.setActor({ role: "player", playerId: "p1" }); });
    act(() => {
      expect(result.current.run({ type: "castVote", matchId: "m1", kind: "player", targetId: "p2", reason: "Hielp het team" })).toBe(true);
      expect(result.current.run({ type: "castVote", matchId: "m1", kind: "highlight", targetId: "h1" })).toBe(true);
    });
    act(() => { result.current.setActor({ role: "coach" }); });
    act(() => { expect(result.current.run({ type: "closeVoting", matchId: "m1" })).toBe(true); });

    expect(getWinners(result.current.state, "m1", NOW)).toEqual({ playerIds: ["p2"], highlightIds: ["h1"] });
    expect(parseSavedDemo(window.localStorage.getItem(DEMO_STORAGE_KEY))).toEqual(result.current.state);
  });
});
