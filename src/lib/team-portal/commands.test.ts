import { describe, expect, it } from "vitest";
import { applyDemoCommand } from "./commands";
import { createDemoState } from "./fixtures";
import { getMatchPhase, getPublishedFeedback, getWinners } from "./selectors";
import { isDemoState, parseSavedDemo } from "./storage";
import { emptyFeedback, type DemoActor, type DemoState } from "./types";

const now = 1800000000000;
const coach: DemoActor = { role: "coach" };
const player: DemoActor = { role: "player", playerId: "p1" };
const parent: DemoActor = { role: "parent", guardianId: "family1" };
const content = { ...emptyFeedback(), compliment: "Je hielp het team.", nextStep: "Loop na je pass weer vrij." };
const readyForVoting = () => applyDemoCommand(createDemoState(now), coach, { type: "reviewHighlight", highlightId: "h2", approved: true }, now);

describe("coach feedback visibility", () => {
  it("keeps new drafts private, publishes only to own player and linked parent", () => {
    const seed = createDemoState(now);
    const saved = applyDemoCommand(seed, coach, { type: "saveFeedback", playerId: "p10", kind: "periodic", content }, now);
    expect(getPublishedFeedback(saved, parent, "p10")).toEqual([]);
    const published = applyDemoCommand(saved, coach, { type: "publishFeedback", feedbackId: "f3" }, now);
    expect(getPublishedFeedback(published, parent, "p10")[0].content).toEqual(content);
    expect(getPublishedFeedback(published, { role: "player", playerId: "p10" }, "p10")).toHaveLength(1);
    expect(getPublishedFeedback(published, player, "p10")).toEqual([]);
    expect(getPublishedFeedback(published, { role: "parent", guardianId: "other" }, "p10")).toEqual([]);
    expect(seed.feedback.find((item) => item.id === "f3")?.published).toBeNull();
  });
  it("preserves the previous publication when a coach edits the draft", () => {
    const seed = createDemoState(now);
    const previous = getPublishedFeedback(seed, player, "p1")[0].content;
    const saved = applyDemoCommand(seed, coach, { type: "saveFeedback", playerId: "p1", kind: "periodic", content }, now);
    expect(getPublishedFeedback(saved, player, "p1")[0].content).toEqual(previous);
    expect(getPublishedFeedback(saved, player, "p1")[0]).not.toHaveProperty("draft");
    const published = applyDemoCommand(saved, coach, { type: "publishFeedback", feedbackId: "f1" }, now);
    expect(getPublishedFeedback(published, player, "p1")[0].content).toEqual(content);
  });
  it("allows partial drafts but rejects empty publications and non-coach writes", () => {
    const seed = createDemoState(now);
    const saved = applyDemoCommand(seed, coach, { type: "saveFeedback", playerId: "p10", kind: "periodic", content: emptyFeedback() }, now);
    expect(() => applyDemoCommand(saved, coach, { type: "publishFeedback", feedbackId: "f3" }, now)).toThrow("compliment");
    for (const actor of [player, parent]) expect(() => applyDemoCommand(seed, actor, { type: "saveFeedback", playerId: "p1", kind: "periodic", content }, now)).toThrow();
  });
});

describe("nominations and fixed candidates", () => {
  it("player proposes, coach approves, then candidates freeze", () => {
    const nominated = applyDemoCommand(readyForVoting(), player, { type: "addHighlight", matchId: "m1", playerId: "p2", category: "Redding", description: "Een geweldige redding.", minute: 21 }, now);
    const highlight = nominated.highlights.at(-1)!;
    expect(highlight.status).toBe("pending");
    expect(() => applyDemoCommand(nominated, coach, { type: "openVoting", matchId: "m1" }, now)).toThrow("Beoordeel");
    const approved = applyDemoCommand(nominated, coach, { type: "reviewHighlight", highlightId: highlight.id, approved: true }, now);
    const opened = applyDemoCommand(approved, coach, { type: "openVoting", matchId: "m1" }, now);
    expect(opened.matches[0].highlightCandidateIds).toContain(highlight.id);
    expect(opened.matches[0].closesAt).toBe(now + 86400000);
    expect(() => applyDemoCommand(opened, coach, { type: "addHighlight", matchId: "m1", playerId: "p3", category: "Verdedigen", description: "Goed verdedigd." }, now)).toThrow("kandidaten");
    expect(() => applyDemoCommand(opened, coach, { type: "reviewHighlight", highlightId: highlight.id, approved: false }, now)).toThrow("vast");
  });
  it("rejected actions never enter the ballot; coach actions immediately approved", () => {
    const rejected = applyDemoCommand(createDemoState(now), coach, { type: "reviewHighlight", highlightId: "h2", approved: false }, now);
    const added = applyDemoCommand(rejected, coach, { type: "addHighlight", matchId: "m1", playerId: "p1", category: "Mooie pass", description: "Slim gespeeld." }, now);
    expect(added.highlights.at(-1)?.status).toBe("approved");
    const opened = applyDemoCommand(added, coach, { type: "openVoting", matchId: "m1" }, now);
    expect(opened.matches[0].highlightCandidateIds).not.toContain("h2");
  });
  it("rejects self nominations, parent actions, invalid minutes and unknown participants", () => {
    const seed = createDemoState(now);
    const command = { type: "addHighlight" as const, matchId: "m1", playerId: "p2", category: "Redding" as const, description: "Mooie redding." };
    expect(() => applyDemoCommand(seed, player, { ...command, playerId: "p1" }, now)).toThrow("teamgenoot");
    expect(() => applyDemoCommand(seed, parent, command, now)).toThrow();
    expect(() => applyDemoCommand(seed, coach, { ...command, playerId: "unknown" }, now)).toThrow();
    for (const minute of [-1, 0, 121, 1.5, NaN]) expect(() => applyDemoCommand(seed, coach, { ...command, minute }, now)).toThrow("minuut");
  });
});

describe("positive elections", () => {
  it("stores one vote of each kind per participant, replacing a previous choice", () => {
    const seed = createDemoState(now);
    const first = applyDemoCommand(seed, player, { type: "castVote", matchId: "m2", kind: "player", targetId: "p2", reason: "Hielp het team" }, now);
    const replaced = applyDemoCommand(first, player, { type: "castVote", matchId: "m2", kind: "player", targetId: "p3", reason: "Sportief gespeeld" }, now);
    const withAction = applyDemoCommand(replaced, player, { type: "castVote", matchId: "m2", kind: "highlight", targetId: "h3" }, now);
    expect(withAction.votes.filter((vote) => vote.matchId === "m2" && vote.voterId === "p1")).toHaveLength(2);
    expect(withAction.votes.find((vote) => vote.voterId === "p1" && vote.kind === "player")?.targetId).toBe("p3");
    expect(withAction.feedback).toEqual(seed.feedback);
    expect(withAction.players).toEqual(seed.players);
    expect(getWinners(withAction, "m2", now)).toEqual({ playerIds: [], highlightIds: [] });
  });
  it("rejects self votes, own actions, missing reasons, parents and coaches", () => {
    const seed = createDemoState(now);
    const vote = { type: "castVote" as const, matchId: "m2", kind: "player" as const, targetId: "p1", reason: "Hielp het team" as const };
    expect(() => applyDemoCommand(seed, player, vote, now)).toThrow("jezelf");
    expect(() => applyDemoCommand(seed, player, { ...vote, targetId: "p2", reason: undefined }, now)).toThrow("reden");
    expect(() => applyDemoCommand(seed, { role: "player", playerId: "p5" }, { type: "castVote", matchId: "m2", kind: "highlight", targetId: "h3" }, now)).toThrow("teamgenoot");
    for (const actor of [parent, coach, { role: "player", playerId: "unknown" } as DemoActor]) expect(() => applyDemoCommand(seed, actor, vote, now)).toThrow();
  });
  it("rejects unapproved or cross-match targets and absent players", () => {
    const seed = createDemoState(now);
    expect(() => applyDemoCommand(seed, player, { type: "castVote", matchId: "m2", kind: "highlight", targetId: "h2" }, now)).toThrow("kandidaat");
    const absent: DemoState = { ...seed, matches: seed.matches.map((match) => match.id === "m2" ? { ...match, participantIds: ["p2"] } : match) };
    expect(() => applyDemoCommand(absent, player, { type: "castVote", matchId: "m2", kind: "highlight", targetId: "h3" }, now)).toThrow("deelnemende");
  });
  it("closes exactly at the deadline and forbids later edits", () => {
    const seed = createDemoState(now);
    const deadline = seed.matches[1].closesAt!;
    expect(getMatchPhase(seed.matches[1], deadline - 1)).toBe("voting");
    expect(getMatchPhase(seed.matches[1], deadline)).toBe("closed");
    expect(() => applyDemoCommand(seed, player, { type: "castVote", matchId: "m2", kind: "highlight", targetId: "h4" }, deadline)).toThrow("open stemming");
  });
  it("shares tied awards and returns no winners without votes", () => {
    const seed = createDemoState(now);
    const tied = applyDemoCommand(seed, player, { type: "castVote", matchId: "m2", kind: "player", targetId: "p2", reason: "Hielp het team" }, now);
    const closed = applyDemoCommand(tied, coach, { type: "closeVoting", matchId: "m2" }, now);
    expect(getWinners(closed, "m2", now).playerIds).toEqual(["p2", "p5"]);
    expect(getWinners({ ...closed, votes: [] }, "m2", now)).toEqual({ playerIds: [], highlightIds: [] });
    expect(() => applyDemoCommand(closed, coach, { type: "openVoting", matchId: "m2" }, now)).toThrow();
  });
});

describe("local persistence boundary", () => {
  it("round trips the seed and edited, published, nominated, voted state", () => {
    const seed = createDemoState(now);
    expect(isDemoState(seed)).toBe(true);
    const voted = applyDemoCommand(seed, player, { type: "castVote", matchId: "m2", kind: "highlight", targetId: "h4" }, now);
    expect(parseSavedDemo(JSON.stringify(voted))).toEqual(voted);
  });
  it("rejects corrupt, outdated and structurally incomplete browser data", () => {
    for (const raw of [null, "{bad", "null", "[]", "{}", JSON.stringify({ ...createDemoState(now), version: 2 }), JSON.stringify({ ...createDemoState(now), players: [] }), JSON.stringify({ ...createDemoState(now), feedback: [{ id: "x" }] })]) expect(parseSavedDemo(raw)).toBeNull();
  });
  it("rejects broken links and duplicate ballots", () => {
    const seed = createDemoState(now);
    expect(isDemoState({ ...seed, votes: [...seed.votes, seed.votes[0]] })).toBe(false);
    expect(isDemoState({ ...seed, matches: seed.matches.map((match) => match.id === "m2" ? { ...match, playerCandidateIds: ["p1", "p1"] } : match) })).toBe(false);
    expect(isDemoState({ ...seed, guardians: [{ id: "g1", name: "Test", childrenIds: ["missing"] }] })).toBe(false);
    expect(isDemoState({ ...seed, votes: [{ ...seed.votes[0], targetId: "missing" }] })).toBe(false);
  });
});
