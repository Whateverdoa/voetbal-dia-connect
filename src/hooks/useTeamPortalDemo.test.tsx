import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoState } from "@/lib/team-portal/fixtures";
import { createRosterDemoState, type LocalDemoRoster } from "@/lib/team-portal/localRoster";
import { GENERAL_DEMO_PROFILE, JO13_02_DEMO_PROFILE, type DemoProfile } from "@/lib/team-portal/demoProfiles";
import { getPublishedFeedback, getWinners } from "@/lib/team-portal/selectors";
import { DEMO_STORAGE_KEY, parseSavedDemo } from "@/lib/team-portal/storage";
import { useTeamPortalDemo } from "./useTeamPortalDemo";
import { emptyReviewInterview } from "@/lib/team-portal/reviewInterview";

const NOW = 1800000000000;
const actionVote = { type: "castVote", matchId: "m2", kind: "highlight", targetId: "h3" } as const;
const localRoster: LocalDemoRoster = { version: 1, teamSlug: "jo13-2", importedAt: "2026-09-26T12:00:00Z", players: [{ id: "roster-example", name: "Testspeler", number: 4, position: "CB" }] };
const rosterProfile: DemoProfile = { ...JO13_02_DEMO_PROFILE, id: "local-roster", storageKey: "test-roster-storage", roster: localRoster };

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
  it("silently saves coach conversations across role changes and reloads, and clears them on reset", () => {
    const first = renderHook(() => useTeamPortalDemo());
    act(() => { first.result.current.setActor({ role: "coach" }); });
    const draft = { ...emptyReviewInterview(), input: "Mijn verhaal over deze speler." };
    act(() => { expect(first.result.current.run({ type: "saveInterview", matchId: "m1", playerId: "p1", draft })).toBe(true); });
    expect(first.result.current.notice).toBeNull();
    act(() => { first.result.current.setActor({ role: "parent", guardianId: "family1" }); });
    expect(first.result.current.state.interviews?.[0].draft).toEqual(draft);
    first.unmount();
    const reloaded = renderHook(() => useTeamPortalDemo());
    expect(reloaded.result.current.state.interviews?.[0].draft).toEqual(draft);
    act(() => { reloaded.result.current.reset(); });
    expect(reloaded.result.current.state.interviews ?? []).toEqual([]);
  });
  it("keeps imported identities separate and preserves them through reload and reset", () => {
    window.localStorage.setItem(JO13_02_DEMO_PROFILE.storageKey, JSON.stringify(createDemoState(NOW)));
    const first = renderHook(() => useTeamPortalDemo(rosterProfile));
    expect(first.result.current.state).toEqual(createRosterDemoState(localRoster));
    expect(first.result.current.actor).toEqual({ role: "player", playerId: "roster-example" });
    act(() => { first.result.current.setActor({ role: "coach" }); });
    act(() => { expect(first.result.current.run({ type: "addHighlight", matchId: "m1", playerId: "roster-example", category: "Mooie pass", description: "Lokaal testmoment" })).toBe(true); });
    first.unmount();
    const next = renderHook(() => useTeamPortalDemo(rosterProfile));
    expect(next.result.current.state.highlights).toHaveLength(1);
    act(() => { next.result.current.reset(); });
    expect(next.result.current.state).toEqual(createRosterDemoState(localRoster));
    expect(parseSavedDemo(window.localStorage.getItem(JO13_02_DEMO_PROFILE.storageKey))).toEqual(createDemoState(NOW));
  });

  it("recovers broken or denied storage with the imported roster, never fictional identities", () => {
    window.localStorage.setItem(rosterProfile.storageKey, "{broken");
    const broken = renderHook(() => useTeamPortalDemo(rosterProfile));
    expect(broken.result.current.state).toEqual(createRosterDemoState(localRoster));
    broken.unmount();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Denied"); });
    const denied = renderHook(() => useTeamPortalDemo(rosterProfile));
    expect(denied.result.current.state).toEqual(createRosterDemoState(localRoster));
    expect(denied.result.current.storageWarning).not.toBe("");
  });

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

describe("team portal profile storage isolation", () => {
  it("edits, reloads and resets JO13-02 without changing the general demo", () => {
    const general = createDemoState(NOW - 3600000);
    general.feedback[0].draft.compliment = "Bewaard concept uit de algemene demo.";
    const generalRaw = JSON.stringify(general);
    window.localStorage.setItem(GENERAL_DEMO_PROFILE.storageKey, generalRaw);
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const first = renderHook(() => useTeamPortalDemo(JO13_02_DEMO_PROFILE), { wrapper: StrictMode });

    expect(JO13_02_DEMO_PROFILE.storageKey).not.toBe(GENERAL_DEMO_PROFILE.storageKey);
    expect(first.result.current.state).toEqual(createDemoState(NOW));
    act(() => { expect(first.result.current.run(actionVote)).toBe(true); });
    act(() => { first.result.current.setActor({ role: "coach" }); });
    act(() => {
      expect(first.result.current.run({ type: "setObservationsEnabled", enabled: true })).toBe(true);
    });
    const pilotEdits = first.result.current.state;
    expect(parseSavedDemo(window.localStorage.getItem(JO13_02_DEMO_PROFILE.storageKey))).toEqual(pilotEdits);
    expect(window.localStorage.getItem(GENERAL_DEMO_PROFILE.storageKey)).toBe(generalRaw);
    first.unmount();

    const reloaded = renderHook(() => useTeamPortalDemo(JO13_02_DEMO_PROFILE));
    expect(reloaded.result.current.state).toEqual(pilotEdits);
    expect(reloaded.result.current.state.observationsEnabled).toBe(true);
    vi.setSystemTime(NOW + 60000);
    act(() => { reloaded.result.current.reset(); });
    const resetState = createDemoState(NOW + 60000);
    expect(reloaded.result.current.state).toEqual(resetState);
    expect(window.localStorage.getItem(GENERAL_DEMO_PROFILE.storageKey)).toBe(generalRaw);
    reloaded.unmount();

    const afterReset = renderHook(() => useTeamPortalDemo(JO13_02_DEMO_PROFILE));
    expect(afterReset.result.current.state).toEqual(resetState);
    for (const [key] of writes.mock.calls) expect(key).toBe(JO13_02_DEMO_PROFILE.storageKey);
    afterReset.unmount();

    const generalReload = renderHook(() => useTeamPortalDemo());
    expect(generalReload.result.current.state).toEqual(general);
    expect(parseSavedDemo(window.localStorage.getItem(JO13_02_DEMO_PROFILE.storageKey))).toEqual(resetState);
  });

  it("does not change the saved pilot when the general demo is edited and reset", () => {
    const pilot = createDemoState(NOW - 7200000);
    pilot.feedback[0].draft.compliment = "Alleen voor de JO13-02-proefversie.";
    pilot.observationsEnabled = true;
    const pilotRaw = JSON.stringify(pilot);
    window.localStorage.setItem(JO13_02_DEMO_PROFILE.storageKey, pilotRaw);
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useTeamPortalDemo(GENERAL_DEMO_PROFILE));

    act(() => { expect(result.current.run(actionVote)).toBe(true); });
    act(() => { result.current.reset(); });

    expect(window.localStorage.getItem(JO13_02_DEMO_PROFILE.storageKey)).toBe(pilotRaw);
    expect(parseSavedDemo(window.localStorage.getItem(GENERAL_DEMO_PROFILE.storageKey))).toEqual(result.current.state);
    for (const [key] of writes.mock.calls) expect(key).toBe(GENERAL_DEMO_PROFILE.storageKey);
  });

  it("loads each target profile before writing when the same mounted hook changes profiles", () => {
    const general = createDemoState(NOW - 3600000);
    general.feedback[0].draft.compliment = "Algemeen concept dat bewaard moet blijven.";
    const pilot = createDemoState(NOW - 7200000);
    pilot.feedback[0].draft.compliment = "Eerder opgeslagen JO13-02-concept.";
    pilot.observationsEnabled = true;
    const pilotRaw = JSON.stringify(pilot);
    window.localStorage.setItem(GENERAL_DEMO_PROFILE.storageKey, JSON.stringify(general));
    window.localStorage.setItem(JO13_02_DEMO_PROFILE.storageKey, pilotRaw);
    const reads = vi.spyOn(Storage.prototype, "getItem");
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const hook = renderHook(({ profile }: { profile: DemoProfile }) => useTeamPortalDemo(profile), {
      initialProps: { profile: GENERAL_DEMO_PROFILE }, wrapper: StrictMode,
    });
    act(() => { expect(hook.result.current.run(actionVote)).toBe(true); });
    const editedGeneral = hook.result.current.state;
    const editedGeneralRaw = window.localStorage.getItem(GENERAL_DEMO_PROFILE.storageKey);
    act(() => { hook.result.current.setActor({ role: "coach" }); });
    reads.mockClear();
    writes.mockClear();

    hook.rerender({ profile: JO13_02_DEMO_PROFILE });

    expect(hook.result.current.ready).toBe(true);
    expect(hook.result.current.state).toEqual(pilot);
    expect(hook.result.current.actor).toEqual({ role: "player", playerId: "p1" });
    expect(reads).toHaveBeenCalledWith(JO13_02_DEMO_PROFILE.storageKey);
    expect(writes).toHaveBeenCalled();
    expect(reads.mock.invocationCallOrder[0]).toBeLessThan(writes.mock.invocationCallOrder[0]);
    for (const [key, raw] of writes.mock.calls) {
      expect(key).toBe(JO13_02_DEMO_PROFILE.storageKey);
      expect(parseSavedDemo(raw)).toEqual(pilot);
    }
    expect(window.localStorage.getItem(GENERAL_DEMO_PROFILE.storageKey)).toBe(editedGeneralRaw);
    expect(window.localStorage.getItem(JO13_02_DEMO_PROFILE.storageKey)).toBe(pilotRaw);
    reads.mockClear();
    writes.mockClear();

    hook.rerender({ profile: GENERAL_DEMO_PROFILE });

    expect(hook.result.current.state).toEqual(editedGeneral);
    expect(reads.mock.invocationCallOrder[0]).toBeLessThan(writes.mock.invocationCallOrder[0]);
    for (const [key, raw] of writes.mock.calls) {
      expect(key).toBe(GENERAL_DEMO_PROFILE.storageKey);
      expect(parseSavedDemo(raw)).toEqual(editedGeneral);
    }
    expect(window.localStorage.getItem(JO13_02_DEMO_PROFILE.storageKey)).toBe(pilotRaw);
  });

  it("creates clean pilot fixtures when switching from an edited general demo to an unused profile", () => {
    const general = createDemoState(NOW - 3600000);
    general.feedback[0].draft.compliment = "Dit concept mag nooit naar een nieuw profiel worden gekopieerd.";
    window.localStorage.setItem(GENERAL_DEMO_PROFILE.storageKey, JSON.stringify(general));
    const hook = renderHook(({ profile }: { profile: DemoProfile }) => useTeamPortalDemo(profile), {
      initialProps: { profile: GENERAL_DEMO_PROFILE },
    });
    const writes = vi.spyOn(Storage.prototype, "setItem");

    hook.rerender({ profile: JO13_02_DEMO_PROFILE });

    expect(hook.result.current.state).toEqual(createDemoState(NOW));
    expect(writes).toHaveBeenCalled();
    for (const [key, raw] of writes.mock.calls) {
      expect(key).toBe(JO13_02_DEMO_PROFILE.storageKey);
      expect(parseSavedDemo(raw)).toEqual(createDemoState(NOW));
    }
    expect(parseSavedDemo(window.localStorage.getItem(GENERAL_DEMO_PROFILE.storageKey))).toEqual(general);
  });
});
