import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { ClubRole } from "../lib/clubAccess";
import { REFEREE_CONFIGS } from "./seedData";

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
