/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
]);

describe("legacy referee assignment migration", () => {
  it("creates one assignment and remains idempotent", async () => {
    const t = convexTest(schema, modules);
    const matchId = await t.run(async (ctx) => {
      const now = Date.now();
      const clubId = await ctx.db.insert("clubs", {
        name: "Migration Club",
        slug: "migration-club",
        createdAt: now,
      });
      const teamId = await ctx.db.insert("teams", {
        clubId,
        name: "JO12-1",
        slug: "jo12-1",
        createdAt: now,
      });
      const refereeId = await ctx.db.insert("referees", {
        name: "Legacy Referee",
        active: true,
        createdAt: now,
      });
      return await ctx.db.insert("matches", {
        teamId,
        publicCode: "MIG001",
        opponent: "Legacy United",
        isHome: true,
        scheduledAt: now + 60_000,
        status: "scheduled",
        currentQuarter: 1,
        quarterCount: 4,
        homeScore: 0,
        awayScore: 0,
        showLineup: false,
        refereeId,
        createdAt: now,
      });
    });

    const first = await t.mutation(
      internal.migrations.refereeAssignments.migrateLegacyAssignmentsBatch,
      { paginationOpts: { cursor: null, numItems: 100 } }
    );
    expect(first.migrated).toBe(1);

    const second = await t.mutation(
      internal.migrations.refereeAssignments.migrateLegacyAssignmentsBatch,
      { paginationOpts: { cursor: null, numItems: 100 } }
    );
    expect(second.migrated).toBe(0);
    expect(second.skipped).toBe(1);

    const state = await t.run(async (ctx) => {
      const assignments = await ctx.db
        .query("refereeAssignments")
        .withIndex("by_match", (q) => q.eq("matchId", matchId))
        .take(10);
      const needs = await ctx.db
        .query("matchRefereeNeeds")
        .withIndex("by_match", (q) => q.eq("matchId", matchId))
        .take(10);
      const audits = await ctx.db
        .query("assignmentAuditEvents")
        .withIndex("by_match_and_created_at", (q) => q.eq("matchId", matchId))
        .take(10);
      return { assignments, needs, audits };
    });
    expect(state.assignments).toHaveLength(1);
    expect(state.assignments[0]).toMatchObject({
      status: "confirmed",
      source: "legacy_migration",
    });
    expect(state.needs).toHaveLength(1);
    expect(state.needs[0].status).toBe("assigned");
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0].eventType).toBe("legacy_assignment_migrated");
  });
});
