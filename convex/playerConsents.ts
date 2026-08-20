/**
 * Parent/player consent for selection-team photos & gamification (AVG).
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";
import { assertConsentGranted } from "./lib/privacyFilter";

const CONSENT_DOC_VERSION = "jo13-v1-2026";
const CONSENT_TYPES = ["photo", "gamification", "public_display"] as const;

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const startConsentRound = mutation({
  args: { teamId: v.id("teams") },
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
    tokens: v.array(
      v.object({
        playerId: v.id("players"),
        playerName: v.string(),
        token: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team niet gevonden");
    if (!team.isSelectionTeam) {
      throw new Error("Alleen selectieteams kunnen een toestemmingsronde starten");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const active = players.filter((p) => p.active);
    let created = 0;
    let skipped = 0;
    const tokens: Array<{
      playerId: typeof active[0]["_id"];
      playerName: string;
      token: string;
    }> = [];
    const now = Date.now();

    for (const player of active) {
      // One shared token per player for all consent types in this round
      const existing = await ctx.db
        .query("playerConsents")
        .withIndex("by_player", (q) => q.eq("playerId", player._id))
        .collect();

      const pendingOrGranted = existing.filter(
        (c) => c.status === "pending" || c.status === "granted"
      );
      if (pendingOrGranted.length >= CONSENT_TYPES.length) {
        skipped++;
        const token = pendingOrGranted[0]?.token;
        if (token) {
          tokens.push({
            playerId: player._id,
            playerName: player.name,
            token,
          });
        }
        continue;
      }

      const token = randomToken();
      for (const consentType of CONSENT_TYPES) {
        const already = existing.find((c) => c.consentType === consentType);
        if (already && (already.status === "pending" || already.status === "granted")) {
          continue;
        }
        if (already) {
          await ctx.db.patch(already._id, {
            status: "pending",
            token,
            documentVersion: CONSENT_DOC_VERSION,
            updatedAt: now,
            revokedAt: undefined,
          });
        } else {
          await ctx.db.insert("playerConsents", {
            playerId: player._id,
            teamId: args.teamId,
            consentType,
            status: "pending",
            documentVersion: CONSENT_DOC_VERSION,
            token,
            createdAt: now,
            updatedAt: now,
          });
        }
        created++;
      }
      tokens.push({
        playerId: player._id,
        playerName: player.name,
        token,
      });
    }

    return { created, skipped, tokens };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      playerName: v.string(),
      teamName: v.string(),
      documentVersion: v.string(),
      consents: v.array(
        v.object({
          consentType: v.union(
            v.literal("photo"),
            v.literal("gamification"),
            v.literal("public_display")
          ),
          status: v.union(
            v.literal("pending"),
            v.literal("granted"),
            v.literal("revoked")
          ),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("playerConsents")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();
    if (rows.length === 0) return null;

    const player = await ctx.db.get(rows[0]!.playerId);
    const team = await ctx.db.get(rows[0]!.teamId);
    if (!player || !team) return null;

    return {
      playerName: player.name,
      teamName: team.name,
      documentVersion: rows[0]!.documentVersion,
      consents: rows.map((r) => ({
        consentType: r.consentType,
        status: r.status,
      })),
    };
  },
});

export const submitConsent = mutation({
  args: {
    token: v.string(),
    choices: v.object({
      photo: v.boolean(),
      gamification: v.boolean(),
      public_display: v.boolean(),
    }),
    grantedBy: v.union(v.literal("parent"), v.literal("player")),
    parentEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("playerConsents")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();
    if (rows.length === 0) throw new Error("Ongeldige of verlopen link");

    const now = Date.now();
    for (const row of rows) {
      const granted = args.choices[row.consentType];
      await ctx.db.patch(row._id, {
        status: granted ? "granted" : "revoked",
        grantedBy: granted ? args.grantedBy : undefined,
        grantedAt: granted ? now : undefined,
        revokedAt: granted ? undefined : now,
        parentEmail: args.parentEmail,
        updatedAt: now,
      });
    }

    // If photo revoked, strip photo from public fields (keep storage for audit via storageId)
    const photoRow = rows.find((r) => r.consentType === "photo");
    const photoGranted = args.choices.photo;
    if (photoRow && !photoGranted) {
      const player = await ctx.db.get(photoRow.playerId);
      if (player?.photoUrl) {
        await ctx.db.patch(photoRow.playerId, { photoUrl: undefined });
      }
    }

    return null;
  },
});

export const listForTeam = query({
  args: { teamId: v.id("teams") },
  returns: v.array(
    v.object({
      playerId: v.id("players"),
      playerName: v.string(),
      consents: v.array(
        v.object({
          consentType: v.string(),
          status: v.string(),
          token: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const rows = await ctx.db
      .query("playerConsents")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const byPlayer = new Map<
      string,
      {
        playerId: (typeof rows)[0]["playerId"];
        playerName: string;
        consents: Array<{ consentType: string; status: string; token: string }>;
      }
    >();

    for (const row of rows) {
      const key = String(row.playerId);
      let entry = byPlayer.get(key);
      if (!entry) {
        const player = await ctx.db.get(row.playerId);
        entry = {
          playerId: row.playerId,
          playerName: player?.name ?? "?",
          consents: [],
        };
        byPlayer.set(key, entry);
      }
      entry.consents.push({
        consentType: row.consentType,
        status: row.status,
        token: row.token,
      });
    }

    return Array.from(byPlayer.values());
  },
});

export const playerHasConsent = query({
  args: {
    playerId: v.id("players"),
    consentType: v.union(
      v.literal("photo"),
      v.literal("gamification"),
      v.literal("public_display")
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("playerConsents")
      .withIndex("by_player_type", (q) =>
        q.eq("playerId", args.playerId).eq("consentType", args.consentType)
      )
      .collect();
    return assertConsentGranted(rows, args.consentType);
  },
});

export const setTeamSelectionFlag = mutation({
  args: {
    teamId: v.id("teams"),
    isSelectionTeam: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    await ctx.db.patch(args.teamId, { isSelectionTeam: args.isSelectionTeam });
    return null;
  },
});
