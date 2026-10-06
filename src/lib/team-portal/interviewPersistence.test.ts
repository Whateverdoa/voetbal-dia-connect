import { describe, expect, it } from "vitest";
import { applyDemoCommand } from "./commands";
import { createDemoState } from "./fixtures";
import { emptyPlayerReview } from "./playerReview";
import { emptyReviewInterview, type ReviewInterviewDraft } from "./reviewInterview";
import { isDemoState, parseSavedDemo } from "./storage";
import type { DemoActor, DemoState } from "./types";

const now = 1800000000000;
const draft = (): ReviewInterviewDraft => ({ ...emptyReviewInterview(), input: "Hij keek goed om zich heen voor de pass.", messages: [{ role: "user", content: "Ik zag een goede aanname." }, { role: "assistant", content: "Hoe hielp hij zijn teamgenoten?" }], followUpCount: 1 });
const save = (state: DemoState, value = draft(), matchId = "m1", playerId = "p1", actor: DemoActor = { role: "coach" }) => applyDemoCommand(state, actor, { type: "saveInterview", matchId, playerId, draft: value }, now);

describe("private demo interview persistence", () => {
  it("accepts existing v1 data and round-trips conversations without changing answers or publications", () => {
    const seed = createDemoState(now);
    expect(isDemoState(seed)).toBe(true);
    const saved = save(seed);
    expect(parseSavedDemo(JSON.stringify(saved))).toEqual(saved);
    expect(saved.playerReviews).toEqual(seed.playerReviews);
    expect(saved.feedback).toEqual(seed.feedback);
    expect(saved.votes).toEqual(seed.votes);
    expect(seed.interviews).toBeUndefined();
  });

  it("isolates caller input and upserts one conversation per player and match", () => {
    const input = draft();
    const first = save(createDemoState(now), input);
    input.messages[0].content = "Changed later";
    expect(first.interviews![0].draft.messages[0].content).not.toBe("Changed later");
    const updated = save(first, { ...draft(), input: "Mijn aanvulling." });
    expect(updated.interviews).toHaveLength(1);
    const otherPlayer = save(updated, draft(), "m1", "p2");
    const otherMatch = save(otherPlayer, draft(), "m2", "p1");
    expect(otherMatch.interviews).toHaveLength(3);
    expect(isDemoState(otherMatch)).toBe(true);
  });

  it("permits an empty restart without overwriting an existing player review", () => {
    const seed = applyDemoCommand(createDemoState(now), { role: "coach" }, { type: "savePlayerReview", matchId: "m1", playerId: "p1", answers: { ...emptyPlayerReview(), positiveMoment: { text: "Bestaand concept", notObserved: false } } }, now);
    const cleared = save(save(seed), emptyReviewInterview());
    expect(cleared.interviews![0].draft).toEqual(emptyReviewInterview());
    expect(cleared.playerReviews).toEqual(seed.playerReviews);
  });

  it("rejects non-coaches and unknown or nonparticipating players", () => {
    const seed = createDemoState(now);
    for (const actor of [{ role: "scout" }, { role: "parent", guardianId: "family1" }, { role: "player", playerId: "p1" }] as DemoActor[]) {
      expect(() => save(seed, draft(), "m1", "p1", actor)).toThrow("Alleen de coach");
    }
    expect(() => save(seed, draft(), "m1", "unknown")).toThrow("Speler niet gevonden");
    expect(() => save(seed, draft(), "unknown", "p1")).toThrow("deelnam");
    seed.matches[0].participantIds = ["p2"];
    expect(() => save(seed)).toThrow("deelnam");
  });

  it("rejects malformed conversations at both command and storage boundaries", () => {
    const seed = createDemoState(now);
    for (const value of [null, {}, { ...draft(), input: "x".repeat(12001) }, { ...draft(), followUpCount: 4 }, { ...draft(), proposal: {} }]) {
      expect(() => save(seed, value as ReviewInterviewDraft)).toThrow("gesprek");
      expect(isDemoState({ ...seed, interviews: [{ matchId: "m1", playerId: "p1", draft: value }] })).toBe(false);
    }
    expect(isDemoState({ ...seed, interviews: null })).toBe(false);
  });

  it("rejects duplicate pairs and references outside the selected match", () => {
    const saved = save(createDemoState(now));
    const row = saved.interviews![0];
    for (const interviews of [[row, row], [{ ...row, playerId: "unknown" }], [{ ...row, matchId: "unknown" }]]) {
      expect(isDemoState({ ...saved, interviews })).toBe(false);
    }
    const match = saved.matches.find((item) => item.id === "m3")!;
    match.participantIds = ["p2"];
    expect(isDemoState({ ...saved, interviews: [{ ...row, matchId: "m3" }] })).toBe(false);
  });
});
