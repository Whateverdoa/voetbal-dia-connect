import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { ClubRole } from "../lib/clubAccess";
import { REFEREE_CONFIGS } from "./seedData";

const m2VerificationScenarioValidator = v.union(
  v.literal("assignment"),
  v.literal("reminder"),
  v.literal("expiry")
);

export const ensureSyntheticBase = internalMutation({
  args: {},
  returns: v.object({
    clubId: v.id("clubs"),
    clubCreated: v.boolean(),
    teamCreated: v.boolean(),
    refereesCreated: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    let club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", "dia"))
      .unique();
    let clubCreated = false;
    if (!club) {
      const clubId = await ctx.db.insert("clubs", {
        name: "DIA Development Testclub",
        slug: "dia",
        createdAt: now,
      });
      club = await ctx.db.get(clubId);
      clubCreated = true;
    }
    if (!club) throw new Error("Synthetic club could not be created");

    const existingTeam = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) =>
        q.eq("clubId", club._id).eq("slug", "jo12-1")
      )
      .unique();
    let teamCreated = false;
    if (!existingTeam) {
      await ctx.db.insert("teams", {
        clubId: club._id,
        name: "JO12-1 Testteam",
        slug: "jo12-1",
        createdAt: now,
      });
      teamCreated = true;
    }

    let refereesCreated = 0;
    for (const referee of REFEREE_CONFIGS) {
      const existingReferee = await ctx.db
        .query("referees")
        .withIndex("by_email", (q) => q.eq("email", referee.email))
        .unique();
      if (existingReferee) continue;
      await ctx.db.insert("referees", {
        name: referee.name,
        email: referee.email,
        active: true,
        createdAt: now,
      });
      refereesCreated += 1;
    }

    return {
      clubId: club._id,
      clubCreated,
      teamCreated,
      refereesCreated,
    };
  },
});

export const createM2VerificationFixture = internalMutation({
  args: {
    runId: v.string(),
    scenario: m2VerificationScenarioValidator,
  },
  returns: v.object({
    clubId: v.id("clubs"),
    matchId: v.id("matches"),
    needId: v.id("matchRefereeNeeds"),
    needStatus: v.union(
      v.literal("open"),
      v.literal("matching"),
      v.literal("awaiting_response"),
      v.literal("awaiting_confirmation"),
      v.literal("assigned"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    needVersion: v.number(),
  }),
  handler: async (ctx, args) => {
    const runId = args.runId.trim().toLowerCase();
    if (!/^[a-z0-9-]{8,80}$/.test(runId)) {
      throw new Error("INVALID_VERIFICATION_RUN_ID");
    }
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", "dia"))
      .unique();
    if (!club) throw new Error("SYNTHETIC_BASE_REQUIRED");
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) =>
        q.eq("clubId", club._id).eq("slug", "jo12-1")
      )
      .unique();
    if (!team) throw new Error("SYNTHETIC_BASE_REQUIRED");

    const fixtureKey = `${args.scenario}:${runId}`;
    let hash = 0;
    for (const character of fixtureKey) {
      hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
    }
    const publicCode = `V${hash.toString(36).toUpperCase().padStart(5, "0").slice(-5)}`;
    const opponent = `M2 ${args.scenario} verification ${runId}`;
    let match = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", publicCode))
      .unique();
    if (match && match.opponent !== opponent) {
      throw new Error("VERIFICATION_FIXTURE_CODE_COLLISION");
    }
    if (!match) {
      const dayOffset =
        args.scenario === "assignment" ? 7 : args.scenario === "reminder" ? 8 : 9;
      const matchId = await ctx.db.insert("matches", {
        teamId: team._id,
        publicCode,
        opponent,
        isHome: true,
        scheduledAt: Date.now() + dayOffset * 24 * 60 * 60 * 1000,
        status: "scheduled",
        currentQuarter: 1,
        quarterCount: 4,
        homeScore: 0,
        awayScore: 0,
        showLineup: false,
        createdAt: Date.now(),
      });
      match = await ctx.db.get(matchId);
    }
    if (!match) throw new Error("VERIFICATION_FIXTURE_CREATE_FAILED");

    let need = await ctx.db
      .query("matchRefereeNeeds")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .first();
    if (!need) {
      const scheduledAt = match.scheduledAt ?? Date.now();
      const needId = await ctx.db.insert("matchRefereeNeeds", {
        matchId: match._id,
        clubId: club._id,
        arrivalAt: scheduledAt - 30 * 60 * 1000,
        expectedEndAt: scheduledAt + 75 * 60 * 1000,
        venue: "Sportpark Development",
        ageGroup: "JO12",
        matchLevel: "recreatief",
        requiredQualification: "club-jeugd",
        status: "open",
        policyVersion: "manual-v1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
      need = await ctx.db.get(needId);
    }
    if (!need) throw new Error("VERIFICATION_FIXTURE_CREATE_FAILED");

    return {
      clubId: club._id,
      matchId: match._id,
      needId: need._id,
      needStatus: need.status,
      needVersion: need.version,
    };
  },
});

export const seedFoundation = internalMutation({
  args: { clubId: v.id("clubs") },
  returns: v.object({
    usersCreated: v.number(),
    membershipsCreated: v.number(),
    profilesCreated: v.number(),
    availabilityWindowsCreated: v.number(),
    openMatchCreated: v.boolean(),
    openNeedCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    let usersCreated = 0;
    let membershipsCreated = 0;
    let profilesCreated = 0;
    let availabilityWindowsCreated = 0;

    const ensureSeedUser = async (seed: {
      key: string;
      email: string;
      displayName: string;
      roles: ClubRole[];
    }) => {
      const tokenIdentifier = `seed|${seed.key}`;
      let user = await ctx.db
        .query("appUsers")
        .withIndex("by_token_identifier", (q) =>
          q.eq("tokenIdentifier", tokenIdentifier)
        )
        .unique();
      if (!user) {
        const userId = await ctx.db.insert("appUsers", {
          tokenIdentifier,
          clerkSubject: `seed-${seed.key}`,
          email: seed.email,
          displayName: seed.displayName,
          createdAt: now,
          updatedAt: now,
        });
        user = await ctx.db.get(userId);
        usersCreated += 1;
      }
      if (!user) throw new Error("Seed user could not be created");

      const membership = await ctx.db
        .query("clubMemberships")
        .withIndex("by_club_and_user", (q) =>
          q.eq("clubId", args.clubId).eq("userId", user._id)
        )
        .unique();
      if (!membership) {
        await ctx.db.insert("clubMemberships", {
          clubId: args.clubId,
          userId: user._id,
          roles: seed.roles,
          status: "active",
          createdAt: now,
          updatedAt: now,
          version: 1,
        });
        membershipsCreated += 1;
      }
      return user._id;
    };

    await ensureSeedUser({
      key: "club-admin",
      email: "club-admin@jeugdvoetbal.test",
      displayName: "Test Clubadmin",
      roles: ["club_admin"],
    });
    await ensureSeedUser({
      key: "planner",
      email: "planner@jeugdvoetbal.test",
      displayName: "Test Planner",
      roles: ["planner"],
    });
    await ensureSeedUser({
      key: "coach",
      email: "coach@jeugdvoetbal.test",
      displayName: "Test Coach",
      roles: ["coach"],
    });

    for (const [index, refereeConfig] of REFEREE_CONFIGS.entries()) {
      const legacyReferee = await ctx.db
        .query("referees")
        .withIndex("by_email", (q) => q.eq("email", refereeConfig.email))
        .unique();
      if (!legacyReferee) continue;

      const userId = await ensureSeedUser({
        key: `referee-${index + 1}`,
        email: `referee-${index + 1}@jeugdvoetbal.test`,
        displayName: refereeConfig.name,
        roles: ["referee"],
      });
      let profile = await ctx.db
        .query("refereeProfiles")
        .withIndex("by_club_and_legacy_referee", (q) =>
          q
            .eq("clubId", args.clubId)
            .eq("legacyRefereeId", legacyReferee._id)
        )
        .unique();
      if (!profile) {
        const profileId = await ctx.db.insert("refereeProfiles", {
          clubId: args.clubId,
          userId,
          legacyRefereeId: legacyReferee._id,
          displayName: legacyReferee.name,
          status: "active",
          travelRadiusKm: 25 + index * 5,
          qualificationLevel: index < 2 ? "club-senior" : "club-jeugd",
          allowedAgeGroups: ["JO11", "JO12", "JO13"],
          allowedMatchLevels: ["recreatief"],
          maxMatchesPerDay: 2,
          minimumRestMinutes: 90,
          notificationPreferences: {
            pushOffers: true,
            pushAssignments: true,
            emailFallback: false,
          },
          createdAt: now,
          updatedAt: now,
          version: 1,
        });
        profile = await ctx.db.get(profileId);
        profilesCreated += 1;
      }
      if (!profile) throw new Error("Seed referee profile could not be created");

      const availability = await ctx.db
        .query("refereeAvailabilityWindows")
        .withIndex("by_referee_and_starts_at", (q) =>
          q.eq("refereeProfileId", profile._id)
        )
        .first();
      if (!availability) {
        const startsAt = now + (index + 1) * 24 * 60 * 60 * 1000;
        await ctx.db.insert("refereeAvailabilityWindows", {
          refereeProfileId: profile._id,
          startsAt,
          endsAt: startsAt + 8 * 60 * 60 * 1000,
          status: "available",
          source: "seed",
          createdAt: now,
          updatedAt: now,
          version: 1,
        });
        availabilityWindowsCreated += 1;
      }
    }

    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) =>
        q.eq("clubId", args.clubId).eq("slug", "jo12-1")
      )
      .unique();
    let openMatch = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", "M1OPEN"))
      .unique();
    let openMatchCreated = false;
    if (!openMatch && team) {
      const matchId = await ctx.db.insert("matches", {
        teamId: team._id,
        publicCode: "M1OPEN",
        opponent: "Testclub United JO12-1",
        isHome: true,
        scheduledAt: now + 7 * 24 * 60 * 60 * 1000,
        status: "scheduled",
        currentQuarter: 1,
        quarterCount: 4,
        homeScore: 0,
        awayScore: 0,
        showLineup: false,
        createdAt: now,
      });
      openMatch = await ctx.db.get(matchId);
      openMatchCreated = true;
    }

    let openNeedCreated = false;
    if (openMatch) {
      const existingNeed = await ctx.db
        .query("matchRefereeNeeds")
        .withIndex("by_match", (q) => q.eq("matchId", openMatch._id))
        .first();
      if (!existingNeed) {
        await ctx.db.insert("matchRefereeNeeds", {
          matchId: openMatch._id,
          clubId: args.clubId,
          arrivalAt: (openMatch.scheduledAt ?? now) - 30 * 60 * 1000,
          expectedEndAt: (openMatch.scheduledAt ?? now) + 75 * 60 * 1000,
          venue: "Sportpark De Gouwen",
          ageGroup: "JO12",
          matchLevel: "recreatief",
          requiredQualification: "club-jeugd",
          status: "open",
          policyVersion: "manual-v1",
          createdAt: now,
          updatedAt: now,
          version: 1,
        });
        openNeedCreated = true;
      }
    }

    return {
      usersCreated,
      membershipsCreated,
      profilesCreated,
      availabilityWindowsCreated,
      openMatchCreated,
      openNeedCreated,
    };
  },
});
