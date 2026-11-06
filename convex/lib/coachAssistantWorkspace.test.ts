import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import { REESHOF_PLAN } from "../../src/lib/substitutions/reeshofPlan";
import { assistantSourceFixture, reviewedFixturePlan } from "../../src/test/fixtures/coachAssistant";
import { validateWorkspaceSave, workspacePlan, workspaceRevision, type WorkspaceSource } from "./coachAssistantWorkspace";

describe("actual match assistant contract", () => {
  it("loads only the selected roster, keeper, formation and pending rules in app sequence", () => {
    const source = assistantSourceFixture();
    source.rows = [{ _id: "row" as Id<"substitutionPlans">, _creationTime: 0, matchId: source.match._id, sequence: 0,
      playerOutId: source.players[0].player._id, playerInId: source.players[3].player._id, targetQuarter: 2,
      status: "pending", createdAt: 0, updatedAt: 0 }];
    const { plan } = workspacePlan(source);
    expect(plan.formation.id).toBe("11v11_1-4-3-3");
    expect(plan.startingLineup.keeperKey).toBe(REESHOF_PLAN.startingLineup.keeperKey);
    expect(plan.players).toHaveLength(15);
    expect(plan.steps[0].matchMinute).toBe(30);
    expect(plan.steps[0].actions[0].id).toBe("row");
    expect(plan.players.find((p) => p.number === 4)?.unavailableReason).toBe("injured");
  });
  it("does not invent a keeper or kickoff positions for an empty lineup", () => {
    const source = assistantSourceFixture();
    source.players.forEach(({ entry }) => { entry.onField = false; entry.isKeeper = false; entry.fieldSlotIndex = undefined; });
    expect(workspacePlan(source).plan.startingLineup).toMatchObject({ keeperKey: "", field: [] });
    expect(workspacePlan(source).warnings.join(" ")).toContain("keeper");
  });
  it("keeps untimed rules unresolved so they cannot silently disappear on save", () => {
    const source = assistantSourceFixture();
    source.rows = [{ _id: "untimed" as Id<"substitutionPlans">, _creationTime: 0, matchId: source.match._id, sequence: 0,
      playerOutId: source.players[0].player._id, playerInId: source.players[3].player._id, status: "pending", createdAt: 0, updatedAt: 0 }];
    expect(workspacePlan(source).plan.review?.unresolved).toHaveLength(1);
  });
  it("accepts a reviewed complete plan and rebuilds canonical display data and coordinates", () => {
    const source = assistantSourceFixture();
    const plan = reviewedFixturePlan(source);
    plan.players[0].name = "Forged name";
    plan.formation.slots[1].x = 999;
    const saved = validateWorkspaceSave(source, plan, workspaceRevision(source), true);
    expect(saved.players[0].name).toBe(source.players[0].player.name);
    expect(saved.formation.slots[1].x).not.toBe(999);
  });
  it("rejects unreviewed, foreign, malformed and live plans", () => {
    const source = assistantSourceFixture();
    const plan = reviewedFixturePlan(source);
    const revision = workspaceRevision(source);
    expect(() => validateWorkspaceSave(source, plan, revision, false)).toThrow("Beoordeel");
    const foreign = structuredClone(plan); foreign.players[0].key = "another-match-player";
    expect(() => validateWorkspaceSave(source, foreign, revision, true)).toThrow("selectie");
    const missing = structuredClone(plan); missing.startingLineup.field.pop();
    expect(() => validateWorkspaceSave(source, missing, revision, true)).toThrow();
    source.match.status = "live";
    expect(() => validateWorkspaceSave(source, plan, revision, true)).toThrow("aftrap");
  });
  it("rejects a stale roster, old pending plan, changed preference or changed formation", () => {
    for (const change of [
      (s: WorkspaceSource) => { s.players[0].entry.injured = true; },
      (s: WorkspaceSource) => { s.players[0].player.positionPrimary = "RB"; },
      (s: WorkspaceSource) => { s.match.formationId = "11v11_1-3-4-3"; },
      (s: WorkspaceSource) => { s.match.scheduledAt! += 1000; },
    ]) {
      const source = assistantSourceFixture(); const plan = reviewedFixturePlan(source); const revision = workspaceRevision(source);
      change(source);
      expect(() => validateWorkspaceSave(source, plan, revision, true)).toThrow("intussen gewijzigd");
    }
  });
  it("rejects keeper rotation, cancellation and replacing already executed rules", () => {
    const source = assistantSourceFixture(); const plan = reviewedFixturePlan(source);
    plan.steps[0].actions[0].keeperKey = plan.startingLineup.keeperKey;
    expect(() => validateWorkspaceSave(source, plan, workspaceRevision(source), true)).toThrow("keeperwissel");
    source.match.cancelledAt = 1;
    expect(() => validateWorkspaceSave(source, plan, workspaceRevision(source), true)).toThrow("aftrap");
    source.match.cancelledAt = undefined;
    source.rows = [{ _id: "done" as Id<"substitutionPlans">, _creationTime: 0, matchId: source.match._id, sequence: 0,
      playerOutId: source.players[0].player._id, playerInId: source.players[3].player._id, status: "executed", createdAt: 0, updatedAt: 0 }];
    expect(() => validateWorkspaceSave(source, plan, workspaceRevision(source), true)).toThrow("aftrap");
  });
});
