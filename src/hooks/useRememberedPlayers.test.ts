import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantPlayer } from "@/lib/coachAssistant/types";
import { useRememberedPlayers } from "./useRememberedPlayers";

const players: AssistantPlayer[] = ["jip", "jonas", "regular"].map((key) => ({ key, availability: "present", primaryPosition: null, secondaryPosition: null }));
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("remembered coach player choices", () => {
  it("keeps absentees, injuries and positions across matches until explicitly changed", () => {
    const first = renderHook(() => useRememberedPlayers("coach:team", players));
    act(() => {
      first.result.current.remember("jip", { availability: "absent" });
      first.result.current.remember("jonas", { availability: "absent" });
      first.result.current.remember("regular", { availability: "injured", primaryPosition: "CB", secondaryPosition: "RB", maxMinutes: 20, minutesNote: "private" });
    });
    first.unmount();
    const next = renderHook(() => useRememberedPlayers("coach:team", structuredClone(players)));
    expect(next.result.current.players.map((player) => player.availability)).toEqual(["absent", "absent", "injured"]);
    expect(next.result.current.players[2]).toMatchObject({ primaryPosition: "CB", secondaryPosition: "RB" });
    expect(JSON.stringify(localStorage)).not.toMatch(/private|maxMinutes/);
    act(() => next.result.current.remember("regular", { availability: "present", primaryPosition: null }));
    next.unmount();
    const recovered = renderHook(() => useRememberedPlayers("coach:team", players));
    expect(recovered.result.current.players[2]).toMatchObject({ availability: "present", primaryPosition: null, secondaryPosition: "RB" });
  });
  it("isolates accounts and teams and does not carry choices into the standalone demo", () => {
    const first = renderHook(() => useRememberedPlayers("coach:team", players));
    act(() => first.result.current.remember("jip", { availability: "absent" }));
    for (const scope of ["other:team", "coach:other-team", undefined]) {
      const view = renderHook(() => useRememberedPlayers(scope, players));
      expect(view.result.current.players[0].availability).toBe("present");
      view.unmount();
    }
  });
  it("reports unavailable storage and ignores malformed remembered values", () => {
    localStorage.setItem("dia-coach-player-preferences:v1:coach:team", '{"jip":{"availability":"oops","primaryPosition":"fake"}}');
    const view = renderHook(() => useRememberedPlayers("coach:team", players));
    expect(view.result.current.players).toEqual(players);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    act(() => view.result.current.remember("jip", { availability: "absent" }));
    expect(view.result.current.storageError).toBe(true);
  });
});
