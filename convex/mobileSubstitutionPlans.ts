import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { verifyCoachTeamMembership, verifyIsMatchLead } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";
import { applyBenchSubstitutionWithSlotTransfer } from "./lib/benchSubstitutionCore";
import {
  buildEventGameTimeStamp,
  getEffectiveEventTime,
} from "./lib/matchEventGameTime";

const kind = v.union(v.literal("substitution"), v.literal("positionSwap"));
const rowValidator = v.object({
  id: v.id("substitutionPlans"),
  sequence: v.number(),
  kind,
  targetQuarter: v.optional(v.number()),
  targetMinute: v.optional(v.number()),
  playerOutId: v.id("players"),
  playerInId: v.id("players"),
  status: v.union(
    v.literal("pending"),
    v.literal("executed"),
    v.literal("skipped"),
  ),
  note: v.optional(v.string()),
  executedAt: v.optional(v.number()),
  executedGameSecond: v.optional(v.number()),
});

async function readState(ctx: QueryCtx | MutationCtx, matchId: Id<"matches">) {
  const match = await ctx.db.get(matchId);
  if (!match || !(await verifyCoachTeamMembership(ctx, match))) return null;
  const [rows, players] = await Promise.all([
    ctx.db
      .query("substitutionPlans")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .take(121),
    ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .take(51),
  ]);
  if (rows.length > 120 || players.length > 50)
    throw new Error("Dit plan is te groot voor de mobiele planner");
  // Snapshot digest: web edits and ad-hoc substitutions invalidate a reviewed command.
  const snapshot = JSON.stringify([
    match.status,
    match.currentQuarter,
    match.quarterStartedAt,
    match.leadCoachId,
    match.activeStoppageStartedAt,
    match.pausedAt,
    match.quarterCount,
    match.regulationDurationMinutes,
    rows,
    players,
  ]);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(snapshot),
  );
  const revision = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return { match, rows, players, revision };
}

export const getMobilePlan = query({
  args: { matchId: v.id("matches") },
  returns: v.union(
    v.null(),
    v.object({
      revision: v.string(),
      canEdit: v.boolean(),
      canExecute: v.boolean(),
      rows: v.array(rowValidator),
      players: v.array(
        v.object({
          playerId: v.id("players"),
          name: v.string(),
          number: v.optional(v.number()),
          onField: v.boolean(),
          isKeeper: v.boolean(),
          absent: v.optional(v.boolean()),
          injured: v.optional(v.boolean()),
          fieldSlotIndex: v.optional(v.number()),
          minutesPlayed: v.number(),
          lastSubbedInAt: v.optional(v.number()),
        }),
      ),
      clock: v.object({
        status: v.union(
          v.literal("scheduled"),
          v.literal("lineup"),
          v.literal("live"),
          v.literal("halftime"),
          v.literal("finished"),
        ),
        currentQuarter: v.number(),
        quarterCount: v.number(),
        duration: v.number(),
        quarterStartedAt: v.optional(v.number()),
        activeStoppageStartedAt: v.optional(v.number()),
        pausedAt: v.optional(v.number()),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const state = await readState(ctx, args.matchId);
    if (!state) return null;
    const { match, rows, players, revision } = state;
    return {
      revision,
      canEdit: match.status !== "finished",
      canExecute:
        (match.status === "live" || match.status === "halftime") &&
        !!(await verifyIsMatchLead(ctx, match)),
      clock: {
        status: match.status,
        currentQuarter: match.currentQuarter,
        quarterCount: match.quarterCount,
        duration: match.regulationDurationMinutes ?? 60,
        quarterStartedAt: match.quarterStartedAt,
        activeStoppageStartedAt: match.activeStoppageStartedAt,
        pausedAt: match.pausedAt,
      },
      rows: rows.map((row) => ({
        id: row._id,
        sequence: row.sequence,
        kind: row.kind ?? "substitution",
        targetQuarter: row.targetQuarter,
        targetMinute: row.targetMinute,
        playerOutId: row.playerOutId,
        playerInId: row.playerInId,
        status: row.status,
        note: row.note,
        executedAt: row.executedAt,
        executedGameSecond: row.executedGameSecond,
      })),
      players: await Promise.all(
        players.map(async (p) => {
          const player = await ctx.db.get(p.playerId);
          return {
            playerId: p.playerId,
            name: player?.name ?? "Onbekende speler",
            number: player?.number,
            onField: p.onField,
            isKeeper: p.isKeeper,
            absent: p.absent,
            injured: p.injured,
            fieldSlotIndex: p.fieldSlotIndex,
            minutesPlayed: p.minutesPlayed ?? 0,
            lastSubbedInAt: p.lastSubbedInAt,
          };
        }),
      ),
    };
  },
});

export function planTiming(
  minute: number,
  atBreak: boolean,
  duration: number,
  periods: number,
) {
  if (!Number.isInteger(minute) || minute < 0 || minute > duration)
    throw new Error(`Kies een hele wedstrijdminuut van 0 tot ${duration}`);
  const length = duration / periods;
  if (atBreak && (minute <= 0 || minute >= duration || minute % length !== 0))
    throw new Error("Kies een rustmoment tussen twee speelperiodes");
  return {
    targetQuarter: Math.min(periods, Math.floor(minute / length) + 1),
    targetMinute: atBreak ? undefined : minute,
  };
}

export const planCommandArgs = {
  matchId: v.id("matches"),
  correlationId: v.string(),
  revision: v.string(),
  operation: v.union(
    v.literal("save"),
    v.literal("remove"),
    v.literal("skip"),
    v.literal("execute"),
    v.literal("earlier"),
  ),
  planId: v.optional(v.id("substitutionPlans")),
  minute: v.optional(v.number()),
  atBreak: v.optional(v.boolean()),
  kind: v.optional(kind),
  playerOutId: v.optional(v.id("players")),
  playerInId: v.optional(v.id("players")),
  note: v.optional(v.string()),
};
type PlanCommand = import("convex/values").ObjectType<typeof planCommandArgs>;

export async function executePlanCommand(
  ctx: MutationCtx,
  args: PlanCommand,
): Promise<{ deduped: boolean }> {
  const state = await readState(ctx, args.matchId);
  if (!state) throw new Error("Geen toegang tot dit wisselplan");
  const { match, rows, players, revision } = state;
  if (args.operation === "execute" && !(await verifyIsMatchLead(ctx, match)))
    throw new Error("Alleen de wedstrijdleider kan de wissel uitvoeren");
  if (!args.correlationId.trim() || args.correlationId.length > 160)
    throw new Error("Ongeldige opdrachtcode");
  if (
    !(await consumeCommandIdempotency(ctx, {
      matchId: args.matchId,
      commandType: `MOBILE_PLAN_${args.operation}`,
      correlationId: args.correlationId,
    }))
  )
    return { deduped: true };
  if (args.revision !== revision)
    throw new Error(
      "Het plan of de opstelling is gewijzigd. Sluit dit venster en controleer de actuele gegevens.",
    );
  if (match.status === "finished")
    throw new Error("Deze wedstrijd is afgelopen");
  const row = args.planId ? rows.find((r) => r._id === args.planId) : undefined;
  if (
    (args.planId || args.operation !== "save") &&
    (!row || row.status !== "pending")
  )
    throw new Error("Deze planregel is niet meer beschikbaar");
  const now = Date.now();
  if (args.operation === "save") {
    if (
      args.minute == null ||
      !args.playerOutId ||
      !args.playerInId ||
      !args.kind
    )
      throw new Error("Kies een minuut en twee spelers");
    if (args.playerOutId === args.playerInId)
      throw new Error("Kies twee verschillende spelers");
    if ((args.note?.length ?? 0) > 200)
      throw new Error("Gebruik maximaal 200 tekens voor de toelichting");
    for (const id of [args.playerOutId, args.playerInId]) {
      const p = players.find((p) => p.playerId === id);
      if (!p || p.absent || p.injured)
        throw new Error(
          "Deze speler is niet beschikbaar in de wedstrijdselectie",
        );
    }
    const timing = planTiming(
      args.minute,
      args.atBreak ?? false,
      match.regulationDurationMinutes ?? 60,
      match.quarterCount,
    );
    const fields = {
      ...timing,
      kind: args.kind,
      playerOutId: args.playerOutId,
      playerInId: args.playerInId,
      note: args.note?.trim() || undefined,
      updatedAt: now,
    };
    if (row) await ctx.db.patch(row._id, fields);
    else {
      if (rows.length >= 120)
        throw new Error("Maximaal 120 planregels per wedstrijd");
      await ctx.db.insert("substitutionPlans", {
        ...fields,
        matchId: args.matchId,
        sequence: Math.max(-1, ...rows.map((r) => r.sequence)) + 1,
        status: "pending",
        createdAt: now,
      });
    }
  } else if (row) {
    if (args.operation === "remove") await ctx.db.delete(row._id);
    if (args.operation === "skip")
      await ctx.db.patch(row._id, { status: "skipped", updatedAt: now });
    if (args.operation === "earlier") {
      const group = rows
        .filter(
          (r) =>
            r.status === "pending" &&
            r.targetQuarter === row.targetQuarter &&
            r.targetMinute === row.targetMinute,
        )
        .sort(
          (a, b) =>
            a.sequence - b.sequence ||
            String(a._id).localeCompare(String(b._id)),
        );
      const index = group.findIndex((r) => r._id === row._id);
      if (index < 1)
        throw new Error("Dit is al de eerste wissel op dit moment");
      [group[index - 1], group[index]] = [group[index], group[index - 1]];
      const start = Math.max(-1, ...rows.map((r) => r.sequence)) + 1;
      for (let i = 0; i < group.length; i++)
        await ctx.db.patch(group[i]._id, {
          sequence: start + i,
          updatedAt: now,
        });
    }
    if (args.operation === "execute")
      await executeSwap(ctx, match, players, row, args.correlationId, now);
  }
  return { deduped: false };
}

async function executeSwap(
  ctx: MutationCtx,
  match: Doc<"matches">,
  players: Doc<"matchPlayers">[],
  row: Doc<"substitutionPlans">,
  correlationId: string,
  now: number,
) {
  if (match.status !== "live" && match.status !== "halftime")
    throw new Error("Start de wedstrijd voordat je een wissel bevestigt");
  const out = players.find((p) => p.playerId === row.playerOutId);
  const incoming = players.find((p) => p.playerId === row.playerInId);
  if (!out || !incoming || !out.onField || incoming.absent || incoming.injured)
    throw new Error("Deze wissel past niet bij de actuele opstelling");
  if (row.kind === "positionSwap") {
    if (!incoming.onField || out.absent || out.injured)
      throw new Error("Beide spelers moeten beschikbaar op het veld staan");
    await ctx.db.patch(out._id, {
      fieldSlotIndex: incoming.fieldSlotIndex,
      isKeeper: incoming.isKeeper,
    });
    await ctx.db.patch(incoming._id, {
      fieldSlotIndex: out.fieldSlotIndex,
      isKeeper: out.isKeeper,
    });
  } else {
    if (incoming.onField)
      throw new Error("De inkomende speler moet op de bank staan");
    const tracking =
      match.status === "live" &&
      match.activeStoppageStartedAt == null &&
      match.pausedAt == null;
    // The shared core starts a timer; a halftime/stoppage substitution must leave it stopped.
    if (!tracking && out.lastSubbedInAt != null)
      await ctx.db.patch(out._id, { lastSubbedInAt: undefined });
    await applyBenchSubstitutionWithSlotTransfer(ctx, {
      matchId: match._id,
      playerOutId: out.playerId,
      playerInId: incoming.playerId,
      correlationId,
      commandType: "MOBILE_EXECUTE_PLAN",
    });
    await ctx.db.patch(out._id, { isKeeper: false });
    await ctx.db.patch(incoming._id, {
      isKeeper: out.isKeeper,
      ...(!tracking ? { lastSubbedInAt: undefined } : {}),
    });
  }
  const stamp = buildEventGameTimeStamp(
    match,
    getEffectiveEventTime(match, now),
  );
  await ctx.db.patch(row._id, {
    status: "executed",
    executedAt: now,
    executedGameSecond: stamp.gameSecond,
    updatedAt: now,
  });
}

export const mobilePlanCommand = mutation({
  args: planCommandArgs,
  returns: v.object({ deduped: v.boolean() }),
  handler: executePlanCommand,
});
