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

describe("referee-first synthetic seed", () => {
  it("creates only the minimal idempotent base without youth or contact data", async () => {
    const t = convexTest(schema, modules);

    const first = await t.mutation(
      internal.seed.refereeFirstMutations.ensureSyntheticBase,
      {}
    );
    const second = await t.mutation(
      internal.seed.refereeFirstMutations.ensureSyntheticBase,
      {}
    );

    expect(first).toMatchObject({
      clubCreated: true,
      teamCreated: true,
      refereesCreated: 4,
    });
    expect(second).toEqual({
      clubId: first.clubId,
      clubCreated: false,
      teamCreated: false,
      refereesCreated: 0,
    });

    const state = await t.run(async (ctx) => ({
      clubs: await ctx.db.query("clubs").take(10),
      teams: await ctx.db.query("teams").take(10),
      referees: await ctx.db.query("referees").take(10),
      players: await ctx.db.query("players").take(1),
      coaches: await ctx.db.query("coaches").take(1),
    }));
    expect(state.clubs).toEqual([
      expect.objectContaining({ name: "DIA Development Testclub", slug: "dia" }),
    ]);
    expect(state.teams).toEqual([
      expect.objectContaining({ name: "JO12-1 Testteam", slug: "jo12-1" }),
    ]);
    expect(state.referees).toHaveLength(4);
    expect(state.referees.every((referee) => referee.email?.endsWith("@dia.local"))).toBe(true);
    expect(state.players).toEqual([]);
    expect(state.coaches).toEqual([]);
  });

  it("creates idempotent isolated fixtures for every M2 live scenario", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      internal.seed.refereeFirstMutations.ensureSyntheticBase,
      {}
    );

    for (const scenario of ["assignment", "reminder", "expiry"] as const) {
      const first = await t.mutation(
        internal.seed.refereeFirstMutations.createM2VerificationFixture,
        { runId: "m2-live-test-run", scenario }
      );
      const replay = await t.mutation(
        internal.seed.refereeFirstMutations.createM2VerificationFixture,
        { runId: "m2-live-test-run", scenario }
      );
      expect(replay).toEqual(first);
      expect(first).toMatchObject({ needStatus: "open", needVersion: 1 });
    }

    const counts = await t.run(async (ctx) => ({
      matches: (await ctx.db.query("matches").take(10)).length,
      needs: (await ctx.db.query("matchRefereeNeeds").take(10)).length,
      players: (await ctx.db.query("players").take(1)).length,
    }));
    expect(counts).toEqual({ matches: 3, needs: 3, players: 0 });
  });
});
