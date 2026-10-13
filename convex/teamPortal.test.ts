// @vitest-environment node
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = {
  "./teamPortal.ts": () => import("./teamPortal"),
  "./teamPortalActions.ts": () => import("./teamPortalActions"),
  "./_generated/server.ts": () => import("./_generated/server"),
};
const slug = "jo13-2";
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const clubId = await ctx.db.insert("clubs", {
      name: "Testclub",
      slug: "testclub",
      createdAt: 1,
    });
    const teamId = await ctx.db.insert("teams", {
      clubId,
      name: "Testteam",
      slug,
      createdAt: 1,
    });
    const otherTeam = await ctx.db.insert("teams", {
      clubId,
      name: "Ander team",
      slug: "jo13-1",
      createdAt: 1,
    });
    const player = await ctx.db.insert("players", {
      teamId,
      name: "Testspeler Een",
      active: true,
      createdAt: 1,
    });
    const sibling = await ctx.db.insert("players", {
      teamId,
      name: "Testspeler Twee",
      active: true,
      createdAt: 1,
    });
    const otherPlayer = await ctx.db.insert("players", {
      teamId: otherTeam,
      name: "Ander Kind",
      active: true,
      createdAt: 1,
    });
    const coachId = await ctx.db.insert("coaches", {
      name: "Testcoach",
      email: "coach@example.test",
      teamIds: [teamId],
      createdAt: 1,
    });
    await ctx.db.insert("userAccess", {
      email: "admin@example.test",
      roles: ["admin"],
      active: true,
      source: "admin_manual",
      createdAt: 1,
      updatedAt: 1,
      lastSyncedAt: 1,
    });
    const parentId = await ctx.db.insert("portalMemberships", {
      teamId,
      accountKey: "email:parent@example.test",
      role: "parent",
      playerIds: [player],
      label: "Testouder",
      active: true,
      updatedBy: "coach",
      createdAt: 1,
      updatedAt: 1,
    });
    const secondParentId = await ctx.db.insert("portalMemberships", {
      teamId,
      accountKey: "email:second@example.test",
      role: "parent",
      playerIds: [player, sibling],
      label: "Tweede testouder",
      active: true,
      updatedBy: "coach",
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.insert("portalMemberships", {
      teamId,
      accountKey: "user:user_child",
      role: "player",
      playerIds: [player],
      label: "Testspeler",
      active: true,
      updatedBy: "coach",
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.insert("portalMemberships", {
      teamId,
      accountKey: "email:manager@example.test",
      role: "team_manager",
      playerIds: [],
      label: "Teammanager",
      active: true,
      updatedBy: "admin",
      createdAt: 1,
      updatedAt: 1,
    });
    const match = await ctx.db.insert("matches", {
      teamId,
      opponent: "Testtegenstander",
      isHome: true,
      homeScore: 2,
      awayScore: 1,
      publicCode: "TEST01",
      status: "finished",
      currentQuarter: 4,
      quarterCount: 4,
      showLineup: false,
      accumulatedPauseTime: 0,
      createdAt: 1,
    });
    return {
      teamId,
      otherTeam,
      player,
      sibling,
      otherPlayer,
      parentId,
      secondParentId,
      coachId,
      match,
    };
  });
  const actor = (name: string, verified = true) =>
    t.withIdentity({
      subject: `user_${name}`,
      issuer: "https://example.clerk.accounts.dev",
      email: `${name}@example.test`,
      emailVerified: verified,
    });
  return {
    t,
    ids,
    actor,
    coach: actor("coach"),
    parent: actor("parent"),
    manager: actor("manager"),
    child: t.withIdentity({
      subject: "user_child",
      issuer: "https://example.clerk.accounts.dev",
    }),
    admin: actor("admin"),
  };
}
const draft = {
  compliment: "Mooie pass",
  nextStep: "Eerst om je heen kijken",
  report: "Eigen observatie",
};

describe("real team portal authorization", () => {
  it("returns anonymous shields to visitors without names, photos or IDs", async () => {
    const { t } = await fixture();
    const result = await t.query(api.teamPortal.overview, { slug });
    expect(result.players).toHaveLength(2);
    expect(
      result.players.every(
        (p) => p.id === null && p.name === "Teamgenoot" && !p.canOpen,
      ),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(
      /Testspeler|example.test|photoUrl/,
    );
  });
  it("does not grant parent rights to unknown or unverified accounts", async () => {
    const { actor } = await fixture();
    for (const client of [actor("unknown"), actor("parent", false)]) {
      expect(
        (await client.query(api.teamPortal.overview, { slug })).access.isMember,
      ).toBe(false);
    }
  });
  it("parents see only linked development and cannot guess another child URL", async () => {
    const { parent, ids } = await fixture();
    expect(
      (
        await parent.query(api.teamPortal.player, {
          slug,
          playerId: ids.player,
        })
      ).canDevelop,
    ).toBe(true);
    await expect(
      parent.query(api.teamPortal.player, { slug, playerId: ids.sibling }),
    ).rejects.toThrow();
    await expect(
      parent.query(api.teamPortal.player, { slug, playerId: ids.otherPlayer }),
    ).rejects.toThrow();
  });
  it("supports two children and multiple parents without widening sibling access", async () => {
    const { parent, actor, ids } = await fixture();
    expect(
      (await actor("second").query(api.teamPortal.overview, { slug })).access
        .ownPlayerIds,
    ).toHaveLength(2);
    expect(
      (await parent.query(api.teamPortal.overview, { slug })).access
        .ownPlayerIds,
    ).toEqual([ids.player]);
  });
  it("supports subject-bound player access without an email and no parent rights", async () => {
    const { child, ids } = await fixture();
    const detail = await child.query(api.teamPortal.player, {
      slug,
      playerId: ids.player,
    });
    expect(detail.canDevelop).toBe(true);
    expect(detail.canConsent).toBe(false);
    expect(detail.canEdit).toBe(false);
    await expect(
      child.query(api.teamPortal.organization, { slug }),
    ).rejects.toThrow();
  });
  it("coaches also have organization access but other teams do not", async () => {
    const { coach, ids } = await fixture();
    expect(
      (await coach.query(api.teamPortal.organization, { slug })).canManage,
    ).toBe(true);
    await expect(
      coach.query(api.teamPortal.player, {
        slug: "jo13-1",
        playerId: ids.otherPlayer,
      }),
    ).rejects.toThrow();
  });
  it("team managers cannot read development or create feedback", async () => {
    const { manager, coach, ids } = await fixture();
    await coach.mutation(api.teamPortalActions.saveFeedback, {
      slug,
      playerId: ids.player,
      content: draft,
      revision: 0,
      action: "publish",
    });
    const detail = await manager.query(api.teamPortal.player, {
      slug,
      playerId: ids.player,
    });
    expect(detail.canDevelop).toBe(false);
    expect(detail.published).toEqual([]);
    expect(detail.draft).toBeNull();
    await expect(
      manager.mutation(api.teamPortalActions.saveFeedback, {
        slug,
        playerId: ids.player,
        content: draft,
        revision: 0,
        action: "publish",
      }),
    ).rejects.toThrow();
  });
  it("club admin has no automatic access to personal feedback", async () => {
    const { admin, ids } = await fixture();
    expect(
      (await admin.query(api.teamPortal.organization, { slug }))
        .canAppointStaff,
    ).toBe(true);
    await expect(
      admin.query(api.teamPortal.player, { slug, playerId: ids.player }),
    ).rejects.toThrow();
  });
  it("only club admin can grant manager rights and parents cannot self-link", async () => {
    const { coach, parent, admin, ids } = await fixture();
    const managerGrant = {
      slug,
      role: "team_manager" as const,
      label: "Manager",
      account: "new@example.test",
      playerIds: [],
      active: true,
      guardianApproved: false,
    };
    await expect(
      coach.mutation(api.teamPortalActions.setMembership, managerGrant),
    ).rejects.toThrow();
    await expect(
      parent.mutation(api.teamPortalActions.setMembership, {
        ...managerGrant,
        role: "parent",
        playerIds: [ids.sibling],
        guardianApproved: true,
      }),
    ).rejects.toThrow();
    await expect(
      admin.mutation(api.teamPortalActions.setMembership, managerGrant),
    ).resolves.toBeTruthy();
  });
  it("validates child team, explicit guardian approval and one child per player account", async () => {
    const { coach, ids } = await fixture();
    const grant = {
      slug,
      role: "parent" as const,
      label: "Ouder",
      account: "new@example.test",
      playerIds: [ids.player],
      active: true,
      guardianApproved: false,
    };
    await expect(
      coach.mutation(api.teamPortalActions.setMembership, grant),
    ).rejects.toThrow();
    await expect(
      coach.mutation(api.teamPortalActions.setMembership, {
        ...grant,
        guardianApproved: true,
        playerIds: [ids.otherPlayer],
      }),
    ).rejects.toThrow();
    await expect(
      coach.mutation(api.teamPortalActions.setMembership, {
        ...grant,
        role: "player",
        guardianApproved: true,
        playerIds: [ids.player, ids.sibling],
      }),
    ).rejects.toThrow();
  });
  it("revocation immediately removes family access", async () => {
    const { coach, parent, ids } = await fixture();
    await coach.mutation(api.teamPortalActions.setMembership, {
      slug,
      role: "parent",
      label: "Ouder",
      account: "parent@example.test",
      playerIds: [ids.player],
      active: false,
      guardianApproved: false,
    });
    await expect(
      parent.query(api.teamPortal.player, { slug, playerId: ids.player }),
    ).rejects.toThrow();
  });
  it("keeps drafts private and published snapshots stable during editing", async () => {
    const { coach, parent, ids, t, actor } = await fixture();
    await t.run((ctx) =>
      ctx.db.insert("coaches", {
        name: "Andere coach",
        email: "othercoach@example.test",
        teamIds: [ids.teamId],
        createdAt: 1,
      }),
    );
    await coach.mutation(api.teamPortalActions.saveFeedback, {
      slug,
      playerId: ids.player,
      content: draft,
      revision: 0,
      action: "save",
    });
    expect(
      (
        await parent.query(api.teamPortal.player, {
          slug,
          playerId: ids.player,
        })
      ).published,
    ).toEqual([]);
    expect(
      (
        await actor("othercoach").query(api.teamPortal.player, {
          slug,
          playerId: ids.player,
        })
      ).draft,
    ).toBeNull();
    await coach.mutation(api.teamPortalActions.saveFeedback, {
      slug,
      playerId: ids.player,
      content: draft,
      revision: 1,
      action: "publish",
    });
    await coach.mutation(api.teamPortalActions.saveFeedback, {
      slug,
      playerId: ids.player,
      content: { ...draft, report: "Nieuw geheim concept" },
      revision: 2,
      action: "save",
    });
    const visible = await parent.query(api.teamPortal.player, {
      slug,
      playerId: ids.player,
    });
    expect(visible.published[0].content.report).toBe("Eigen observatie");
    expect(visible.draft).toBeNull();
    await coach.mutation(api.teamPortalActions.saveFeedback, {
      slug,
      playerId: ids.player,
      content: draft,
      revision: 3,
      action: "withdraw",
    });
    expect(
      (
        await parent.query(api.teamPortal.player, {
          slug,
          playerId: ids.player,
        })
      ).published,
    ).toEqual([]);
  });
  it("rejects stale feedback edits", async () => {
    const { coach, ids } = await fixture();
    const args = {
      slug,
      playerId: ids.player,
      content: draft,
      revision: 0,
      action: "save" as const,
    };
    await coach.mutation(api.teamPortalActions.saveFeedback, args);
    await expect(
      coach.mutation(api.teamPortalActions.saveFeedback, args),
    ).rejects.toThrow(/elders gewijzigd/);
  });
  it("profile sharing never shares personal feedback", async () => {
    const { parent, manager, t, ids } = await fixture();
    await parent.mutation(api.teamPortalActions.setConsent, {
      slug,
      playerId: ids.player,
      teamProfile: true,
      publicProfile: true,
    });
    const publicData = await t.query(api.teamPortal.overview, { slug });
    expect(publicData.players.find((p) => p.id === ids.player)?.name).toBe(
      "Testspeler",
    );
    expect(publicData.players.find((p) => p.id === ids.player)?.canOpen).toBe(
      false,
    );
    await expect(
      manager.mutation(api.teamPortalActions.setConsent, {
        slug,
        playerId: ids.player,
        teamProfile: true,
        publicProfile: true,
      }),
    ).rejects.toThrow();
    await parent.mutation(api.teamPortalActions.setConsent, {
      slug,
      playerId: ids.player,
      teamProfile: false,
      publicProfile: false,
    });
    expect(
      (await t.query(api.teamPortal.overview, { slug })).players.every(
        (p) => p.id === null,
      ),
    ).toBe(true);
  });
  it("tasks require the assigned parent and reassigning resets confirmation", async () => {
    const { manager, parent, actor, t, ids } = await fixture();
    const args = {
      slug,
      matchId: ids.match,
      title: "Shirts wassen",
      assigneeId: ids.parentId,
      revision: 0,
    };
    const taskId = await manager.mutation(
      api.teamPortalActions.assignTask,
      args,
    );
    await expect(
      t.query(api.teamPortal.organization, { slug }),
    ).rejects.toThrow();
    expect(
      (await parent.query(api.teamPortal.organization, { slug })).memberships,
    ).toEqual([]);
    await expect(
      actor("second").mutation(api.teamPortalActions.respondToTask, {
        slug,
        taskId,
        revision: 1,
        status: "confirmed",
        response: "",
      }),
    ).rejects.toThrow();
    await parent.mutation(api.teamPortalActions.respondToTask, {
      slug,
      taskId,
      revision: 1,
      status: "confirmed",
      response: "",
    });
    await manager.mutation(api.teamPortalActions.assignTask, {
      ...args,
      taskId,
      revision: 2,
      assigneeId: ids.secondParentId,
    });
    expect(
      (await manager.query(api.teamPortal.organization, { slug })).tasks[0]
        .status,
    ).toBe("pending");
    await expect(
      parent.mutation(api.teamPortalActions.respondToTask, {
        slug,
        taskId,
        revision: 2,
        status: "done",
        response: "",
      }),
    ).rejects.toThrow();
    await actor("second").mutation(api.teamPortalActions.respondToTask, {
      slug,
      taskId,
      revision: 3,
      status: "confirmed",
      response: "",
    });
    await actor("second").mutation(api.teamPortalActions.respondToTask, {
      slug,
      taskId,
      revision: 4,
      status: "done",
      response: "",
    });
    expect(
      (await parent.query(api.teamPortal.organization, { slug })).tasks[0]
        .status,
    ).toBe("done");
  });
});
