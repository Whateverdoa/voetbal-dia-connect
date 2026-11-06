import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { REESHOF_PLAN } from "../../lib/substitutions/reeshofPlan";
import { proposeCoachPlan } from "../../lib/coachAssistant/proposePlan";
import { workspacePlan, type WorkspaceSource } from "../../../convex/lib/coachAssistantWorkspace";

export function assistantSourceFixture(): WorkspaceSource {
  const matchId = "test-match" as Id<"matches">;
  const teamId = "test-team" as Id<"teams">;
  const match: Doc<"matches"> = { _id: matchId, _creationTime: 0, teamId, publicCode: "UYXS3M", opponent: "Test2", isHome: false,
    status: "scheduled", currentQuarter: 1, quarterCount: 2, regulationDurationMinutes: 60, homeScore: 0, awayScore: 0,
    showLineup: false, createdAt: 0, scheduledAt: Date.parse("2026-10-17T09:30:00+02:00"), formationId: "11v11_1-4-3-3" };
  const players = REESHOF_PLAN.players.map((p) => ({
    player: { _id: p.key as Id<"players">, _creationTime: 0, teamId, name: p.name, number: p.number ?? undefined, active: true, createdAt: 0 } satisfies Doc<"players">,
    entry: { _id: `entry-${p.key}` as Id<"matchPlayers">, _creationTime: 0, playerId: p.key as Id<"players">, matchId, createdAt: 0,
      onField: REESHOF_PLAN.startingLineup.field.some((r) => r.playerKey === p.key),
      fieldSlotIndex: REESHOF_PLAN.startingLineup.field.find((r) => r.playerKey === p.key)?.slotId,
      isKeeper: REESHOF_PLAN.startingLineup.keeperKey === p.key, absent: p.absent, injured: p.unavailableReason === "injured" } satisfies Doc<"matchPlayers">,
  }));
  return { match, players, rows: [], custom: null };
}

export function reviewedFixturePlan(source: WorkspaceSource) {
  const { plan } = workspacePlan(source);
  const result = proposeCoachPlan({ teamKey: String(source.match.teamId), targetDate: "2026-10-17", plan, keeperKey: plan.startingLineup.keeperKey,
    players: plan.players.map((p) => ({ key: p.key, availability: p.absent ? "injured" : "present", primaryPosition: null, secondaryPosition: null })),
    history: [], intervalMinutes: 10, includeSubstitutions: true });
  if (!result.ok) throw new Error(result.errors.join(", "));
  return { ...result.proposal.plan, review: { sourceConfirmed: true } };
}
