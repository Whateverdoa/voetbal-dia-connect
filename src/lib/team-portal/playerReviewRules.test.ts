import { describe, expect, it } from "vitest";
import { applyDemoCommand } from "./commands";
import { createDemoState } from "./fixtures";
import { emptyPlayerReview, type PlayerReview } from "./playerReview";
import { isDemoPlayerReview } from "./playerReviewRules";
import { getPublishedPlayerReviews } from "./selectors";
import { isDemoState, parseSavedDemo } from "./storage";
import type { DemoActor, DemoPlayerReview, DemoState } from "./types";

const now = 1800000000000;
const coach: DemoActor = { role: "coach" };
const ownPlayer: DemoActor = { role: "player", playerId: "p1" };
const guardian: DemoActor = { role: "parent", guardianId: "family1" };
const seed = (): DemoState => ({ ...createDemoState(now), playerReviews: undefined });
function readyAnswers(): PlayerReview {
  return {
    ...emptyPlayerReview(),
    positiveMoment: { text: "Je speelde de bal rustig naar de vrije teamgenoot.", notObserved: false },
    teamwork: { text: "Je wees waar de ruimte lag.", notObserved: false },
    nextStep: { text: "Kijk voor je aanname over je schouder.", notObserved: false },
  };
}
function save(state = seed(), answers = readyAnswers(), playerId = "p1", matchId = "m1", timestamp = now) {
  return applyDemoCommand(state, coach, { type: "savePlayerReview", playerId, matchId, answers }, timestamp);
}
function publish(state = save(), timestamp = now + 1) {
  return applyDemoCommand(state, coach, { type: "publishPlayerReview", reviewId: state.playerReviews![0].id }, timestamp);
}

describe("personal player review commands", () => {
  it("allows unfinished drafts and leaves legacy feedback, votes and observations untouched", () => {
    const state = seed();
    const result = save(state, emptyPlayerReview());
    expect(result.playerReviews).toHaveLength(1);
    expect(result.playerReviews![0].published).toBeNull();
    expect(result.feedback).toEqual(state.feedback);
    expect(result.votes).toEqual(state.votes);
    expect(result.observations).toEqual(state.observations);
    expect(state.playerReviews).toBeUndefined();
    expect(getPublishedPlayerReviews(result, ownPlayer, "p1")).toEqual([]);
  });

  it("copies caller answers and upserts exactly one record per match and player", () => {
    const answers = readyAnswers();
    const saved = save(seed(), answers);
    answers.positiveMoment.text = "A later caller mutation";
    expect(saved.playerReviews![0].draft.positiveMoment.text).not.toContain("mutation");
    const updated = save(saved, readyAnswers(), "p1", "m1", now + 1);
    expect(updated.playerReviews).toHaveLength(1);
    expect(updated.playerReviews![0].id).toBe(saved.playerReviews![0].id);
    const differentPlayer = save(updated, readyAnswers(), "p2", "m1", now + 2);
    const differentMatch = save(differentPlayer, readyAnswers(), "p1", "m2", now + 3);
    expect(differentMatch.playerReviews).toHaveLength(3);
    expect(isDemoState(differentMatch)).toBe(true);
  });

  it("retains the published snapshot while editing and replaces it only on republish", () => {
    const published = publish();
    const original = structuredClone(published.playerReviews![0].published);
    expect(published.playerReviews![0].draft).not.toBe(published.playerReviews![0].published);
    const changes = readyAnswers();
    changes.teamwork.text = "Je hielp de verdediger na balverlies.";
    const revised = save(published, changes, "p1", "m1", now + 2);
    expect(revised.playerReviews![0].published).toEqual(original);
    expect(getPublishedPlayerReviews(revised, ownPlayer, "p1")[0].content).toEqual(original);
    const republished = publish(revised, now + 3);
    expect(republished.playerReviews![0].published).toEqual(changes);
    expect(republished.playerReviews![0].publishedAt).toBe(now + 3);
    expect(published.playerReviews![0].published).toEqual(original);
  });

  it("keeps withheld notes in the draft only and trims published text", () => {
    const answers = readyAnswers();
    answers.positiveMoment.text = "  Je speelde de bal goed vooruit.  ";
    answers.teamwork = { text: "Private uncertain memory", notObserved: true };
    const result = publish(save(seed(), answers));
    expect(result.playerReviews![0].draft.teamwork.text).toBe("Private uncertain memory");
    const visible = getPublishedPlayerReviews(result, guardian, "p1")[0];
    expect(visible.content.teamwork).toEqual({ text: "", notObserved: true });
    expect(visible.content.positiveMoment.text).toBe("Je speelde de bal goed vooruit.");
    expect(JSON.stringify(visible)).not.toContain("Private uncertain memory");
    expect(isDemoState(result)).toBe(true);
    const corruptSnapshot = { ...result.playerReviews![0], published: answers };
    expect(isDemoPlayerReview(corruptSnapshot)).toBe(false);
  });

  it("rejects save and publication for players, parents and scouts", () => {
    const saved = save();
    const actors: DemoActor[] = [ownPlayer, guardian, { role: "scout" }];
    for (const actor of actors) {
      expect(() => applyDemoCommand(saved, actor, { type: "savePlayerReview", matchId: "m1", playerId: "p1", answers: readyAnswers() }, now + 1)).toThrow("Alleen de coach");
      expect(() => applyDemoCommand(saved, actor, { type: "publishPlayerReview", reviewId: saved.playerReviews![0].id }, now + 1)).toThrow("Alleen de coach");
    }
  });

  it("rejects missing players, missing matches and players outside the match", () => {
    expect(() => save(seed(), readyAnswers(), "missing")).toThrow("Speler niet gevonden");
    expect(() => save(seed(), readyAnswers(), "p1", "missing")).toThrow("deelnam");
    const absent = seed();
    absent.matches[0].participantIds = ["p2"];
    expect(() => save(absent)).toThrow("deelnam");
    const saved = save();
    saved.matches[0].participantIds = ["p2"];
    expect(() => publish(saved)).toThrow("deelnam");
  });

  it("requires all core answers or explicit not observed and at least one observed answer", () => {
    expect(() => publish(save(seed(), emptyPlayerReview()))).toThrow("drie basisvragen");
    const unseen = emptyPlayerReview();
    unseen.positiveMoment.notObserved = true;
    unseen.teamwork.notObserved = true;
    unseen.nextStep.notObserved = true;
    expect(() => publish(save(seed(), unseen))).toThrow("concrete waarneming");
    unseen.onBall.text = "Je ving de hoge bal en hervatte meteen naar de flank.";
    expect(publish(save(seed(), unseen)).playerReviews![0].published).toEqual(unseen);
  });

  it("rejects overlong answers, malformed answers, missing drafts and invalid timestamps", () => {
    const answers = readyAnswers();
    answers.onBall.text = "x".repeat(801);
    expect(() => save(seed(), answers)).toThrow("800");
    expect(() => save(seed(), {} as PlayerReview)).toThrow("antwoorden");
    expect(() => applyDemoCommand(seed(), coach, { type: "publishPlayerReview", reviewId: "missing" }, now)).toThrow("Bewaar eerst");
    for (const timestamp of [NaN, Infinity, -1]) expect(() => save(seed(), readyAnswers(), "p1", "m1", timestamp)).toThrow("tijdstip");
  });
});

describe("published review access", () => {
  it("shows only publication to own player, linked parent and coach, with no draft fields", () => {
    const state = publish();
    for (const actor of [ownPlayer, guardian, coach]) {
      const visible = getPublishedPlayerReviews(state, actor, "p1");
      expect(visible).toHaveLength(1);
      expect(visible[0]).not.toHaveProperty("draft");
      expect(visible[0]).not.toHaveProperty("updatedAt");
    }
    const denied: DemoActor[] = [{ role: "player", playerId: "p2" }, { role: "parent", guardianId: "missing" }, { role: "scout" }];
    for (const actor of denied) expect(getPublishedPlayerReviews(state, actor, "p1")).toEqual([]);
  });

  it("isolates published selector results and sorts reports newest first", () => {
    const first = publish();
    const secondDraft = save(first, readyAnswers(), "p1", "m2", now + 2);
    const second = applyDemoCommand(secondDraft, coach, { type: "publishPlayerReview", reviewId: secondDraft.playerReviews![1].id }, now + 3);
    const visible = getPublishedPlayerReviews(second, ownPlayer, "p1");
    expect(visible.map((item) => item.matchId)).toEqual(["m2", "m1"]);
    visible[0].content.positiveMoment.text = "Changed projection";
    expect(second.playerReviews![1].published!.positiveMoment.text).not.toBe("Changed projection");
  });
});

describe("player review persistence validation", () => {
  it("accepts old v1 state, incomplete drafts and published round trips without migration", () => {
    expect(isDemoState(seed())).toBe(true);
    expect(parseSavedDemo(JSON.stringify(seed()))?.feedback).toEqual(seed().feedback);
    const draft = save(seed(), emptyPlayerReview());
    expect(parseSavedDemo(JSON.stringify(draft))).toEqual(draft);
    const published = publish();
    expect(parseSavedDemo(JSON.stringify(published))).toEqual(published);
  });

  it("rejects malformed rows, invalid publication snapshots and invalid timestamps", () => {
    const valid = publish().playerReviews![0];
    const invalid: unknown[] = [
      null, [], {},
      { ...valid, id: "" }, { ...valid, playerId: " " }, { ...valid, matchId: "" },
      { ...valid, draft: {} }, { ...valid, draft: { ...readyAnswers(), onBall: { text: "x".repeat(801), notObserved: false } } },
      { ...valid, published: emptyPlayerReview() }, { ...valid, published: undefined },
      { ...valid, publishedAt: undefined }, { ...valid, publishedAt: NaN },
      { ...valid, publishedAt: now + 99 }, { ...valid, updatedAt: -1 },
      { ...valid, updatedAt: Infinity }, { ...valid, published: null },
    ];
    expect(isDemoPlayerReview(valid)).toBe(true);
    for (const value of invalid) expect(isDemoPlayerReview(value)).toBe(false);
    expect(isDemoState({ ...seed(), playerReviews: null })).toBe(false);
  });

  it("rejects duplicate ids, duplicate player/match pairs and invalid relations", () => {
    const state = publish();
    const review = state.playerReviews![0];
    const badRows: DemoPlayerReview[][] = [
      [review, { ...review }],
      [review, { ...review, id: "different" }],
      [review, { ...review, playerId: "p2" }],
      [{ ...review, playerId: "unknown" }],
      [{ ...review, matchId: "unknown" }],
    ];
    for (const playerReviews of badRows) expect(isDemoState({ ...state, playerReviews })).toBe(false);
    const absent = { ...state, matches: state.matches.map((match) => ({ ...match, participantIds: ["p2"] })) };
    expect(isDemoState(absent)).toBe(false);
  });
});
