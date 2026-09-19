import { v, type ObjectType } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdminAccess } from "./adminAuth";
import { getAuthenticatedEmail, getUserAccessByEmail, type AccessRole } from "./lib/userAccess";
import { assertValidMatchTiming } from "./lib/matchTiming";
import { seasonKeyFromMs } from "./lib/season";
import { generatePublicCode, MAX_CODE_GENERATION_ATTEMPTS } from "./helpers";
import { hasScheduleOverlap } from "../src/lib/referee/eligibility";

type ReadCtx = QueryCtx | MutationCtx;
const status = v.union(v.literal("scheduled"), v.literal("lineup"), v.literal("live"), v.literal("halftime"), v.literal("finished"));
const matchRow = v.object({
  id: v.id("matches"), teamId: v.id("teams"), opponent: v.string(), isHome: v.boolean(), status,
  scheduledAt: v.optional(v.number()), coachId: v.optional(v.id("coaches")), refereeId: v.optional(v.id("referees")),
  quarterCount: v.number(), regulationDurationMinutes: v.number(), homeScore: v.number(), awayScore: v.number(),
  teamLogoUrl: v.optional(v.string()), clubLogoUrl: v.optional(v.string()), opponentLogoUrl: v.optional(v.string()),
});
const catalogValidator = v.object({
  revision: v.string(),
  clubs: v.array(v.object({ id: v.id("clubs"), name: v.string(), logoUrl: v.optional(v.string()) })),
  teams: v.array(v.object({ id: v.id("teams"), clubId: v.id("clubs"), name: v.string(), slug: v.string(), logoUrl: v.optional(v.string()) })),
  coaches: v.array(v.object({ id: v.id("coaches"), name: v.string(), email: v.optional(v.string()), teamIds: v.array(v.id("teams")) })),
  referees: v.array(v.object({ id: v.id("referees"), name: v.string(), email: v.optional(v.string()), active: v.boolean() })),
  players: v.array(v.object({ id: v.id("players"), teamId: v.id("teams"), name: v.string(), number: v.optional(v.number()), positionPrimary: v.optional(v.string()), active: v.boolean() })),
  matches: v.array(matchRow), hasMoreMatches: v.boolean(),
});
const matchValidator = v.object({
  revision: v.string(), match: matchRow,
  selection: v.array(v.object({ playerId: v.id("players"), onField: v.boolean(), isKeeper: v.boolean(), fieldSlotIndex: v.optional(v.number()) })),
  playerIds: v.array(v.id("players")), starterIds: v.array(v.id("players")), keeperId: v.optional(v.id("players")),
});

async function digest(value: unknown) {
  const serialized = JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)));
    }
    return item;
  });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}
function capacity(rows: unknown[], limit: number, label: string) {
  if (rows.length > limit) throw new Error(`${label}: te veel gegevens voor mobiel beheer. Gebruik DIA web.`);
}
function requiredName(value: string, label = "Naam") {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) throw new Error(`${label} moet 1 tot 120 tekens bevatten`);
  return trimmed;
}
function normalizedEmail(value?: string) {
  const email = value?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Vul een geldig e-mailadres in");
  return email;
}
function projectMatch(match: Doc<"matches">, team: Doc<"teams"> | null | undefined, club: Doc<"clubs"> | null | undefined) {
  return {
    id: match._id, teamId: match.teamId, opponent: match.opponent, isHome: match.isHome, status: match.status,
    scheduledAt: match.scheduledAt, coachId: match.coachId, refereeId: match.refereeId,
    quarterCount: match.quarterCount, regulationDurationMinutes: match.regulationDurationMinutes ?? 60,
    homeScore: match.homeScore, awayScore: match.awayScore,
    teamLogoUrl: team?.logoUrl, clubLogoUrl: club?.logoUrl, opponentLogoUrl: match.opponentLogoUrl,
  };
}

export async function readAdminCatalog(ctx: ReadCtx, teamId?: Id<"teams">) {
  await requireAdminAccess(ctx);
  const [clubs, teams, coaches, referees, players, matches] = await Promise.all([
    ctx.db.query("clubs").withIndex("by_slug").take(101),
    ctx.db.query("teams").withIndex("by_slug_only").take(501),
    ctx.db.query("coaches").withIndex("by_email").take(501),
    ctx.db.query("referees").withIndex("by_email").take(501),
    teamId ? ctx.db.query("players").withIndex("by_team", q => q.eq("teamId", teamId)).take(201) : Promise.resolve([]),
    ctx.db.query("matches").withIndex("by_createdAt").order("desc").take(251),
  ]);
  capacity(clubs, 100, "Clubs"); capacity(teams, 500, "Teams"); capacity(coaches, 500, "Coaches");
  capacity(referees, 500, "Scheidsrechters"); capacity(players, 200, "Spelers");
  if (teamId && !teams.some(team => team._id === teamId)) throw new Error("Team niet gevonden");
  const teamById = new Map(teams.map(team => [team._id, team]));
  const clubById = new Map(clubs.map(club => [club._id, club]));
  const catalog = {
    clubs: clubs.map(row => ({ id: row._id, name: row.name, logoUrl: row.logoUrl })),
    teams: teams.map(row => ({ id: row._id, clubId: row.clubId, name: row.name, slug: row.slug, logoUrl: row.logoUrl })),
    coaches: coaches.map(row => ({ id: row._id, name: row.name, email: row.email, teamIds: row.teamIds })),
    referees: referees.map(row => ({ id: row._id, name: row.name, email: row.email, active: row.active })),
    players: players.map(row => ({ id: row._id, teamId: row.teamId, name: row.name, number: row.number, positionPrimary: row.positionPrimary, active: row.active })),
    matches: matches.slice(0, 250).map(match => {
      const team = teamById.get(match.teamId);
      return projectMatch(match, team, team ? clubById.get(team.clubId) : undefined);
    }),
    hasMoreMatches: matches.length > 250,
  };
  return { ...catalog, revision: await digest([teamId ?? null, catalog]) };
}

async function readMatchState(ctx: ReadCtx, matchId: Id<"matches">) {
  const match = await ctx.db.get(matchId);
  if (!match) return null;
  const [selection, plans] = await Promise.all([
    ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", matchId)).take(51),
    ctx.db.query("substitutionPlans").withIndex("by_match", q => q.eq("matchId", matchId)).take(121),
  ]);
  capacity(selection, 50, "Wedstrijdselectie"); capacity(plans, 120, "Wisselplan");
  return { match, selection, plans, revision: await digest([match, selection, plans]) };
}
export async function readAdminMatch(ctx: ReadCtx, matchId: Id<"matches">) {
  await requireAdminAccess(ctx);
  const state = await readMatchState(ctx, matchId);
  if (!state) return null;
  const team = await ctx.db.get(state.match.teamId);
  const club = team ? await ctx.db.get(team.clubId) : null;
  const selection = state.selection.slice().sort((a, b) => (a.fieldSlotIndex ?? 100) - (b.fieldSlotIndex ?? 100));
  return {
    revision: state.revision, match: projectMatch(state.match, team, club),
    selection: selection.map(row => ({ playerId: row.playerId, onField: row.onField, isKeeper: row.isKeeper, fieldSlotIndex: row.fieldSlotIndex })),
    playerIds: selection.map(row => row.playerId), starterIds: selection.filter(row => row.onField).map(row => row.playerId),
    keeperId: selection.find(row => row.onField && row.isKeeper)?.playerId,
  };
}
export const getMobileAdminCatalog = query({ args: { teamId: v.optional(v.id("teams")) }, returns: v.union(v.null(), catalogValidator), handler: (ctx, args) => readAdminCatalog(ctx, args.teamId) });
export const getMobileAdminMatch = query({ args: { matchId: v.id("matches") }, returns: v.union(v.null(), matchValidator), handler: (ctx, args) => readAdminMatch(ctx, args.matchId) });

async function beginCommand(ctx: MutationCtx, correlationId: string, operation: string, args: unknown) {
  await requireAdminAccess(ctx);
  const actorEmail = await getAuthenticatedEmail(ctx);
  if (!actorEmail) throw new Error("Niet ingelogd");
  if (!correlationId.trim() || correlationId.length > 160) throw new Error("Ongeldige opdrachtcode");
  const payloadHash = await digest([operation, args]);
  const existing = await ctx.db.query("mobileAdminCommandDedupes").withIndex("by_actor_correlation", q => q.eq("actorEmail", actorEmail).eq("correlationId", correlationId)).unique();
  if (existing && existing.payloadHash !== payloadHash) throw new Error("Deze opdrachtcode is al gebruikt voor een andere wijziging");
  return { actorEmail, correlationId, payloadHash, existing };
}
async function finishCommand(ctx: MutationCtx, command: Awaited<ReturnType<typeof beginCommand>>, resultId: string) {
  await ctx.db.insert("mobileAdminCommandDedupes", { actorEmail: command.actorEmail, correlationId: command.correlationId, payloadHash: command.payloadHash, resultId, createdAt: Date.now() });
}
function checkRevision(expected: string | undefined, actual: string) {
  if (!expected || expected !== actual) throw new Error("Deze gegevens zijn inmiddels gewijzigd. Herlaad en controleer je invoer.");
}
async function validateStaff(ctx: MutationCtx, args: { teamId: Id<"teams">; coachId: Id<"coaches">; refereeId?: Id<"referees">; scheduledAt?: number; regulationDurationMinutes: number; matchId?: Id<"matches"> }) {
  const coach = await ctx.db.get(args.coachId);
  if (!coach || !coach.teamIds.includes(args.teamId)) throw new Error("Kies een coach die aan dit team is gekoppeld");
  if (coach.email && (await getUserAccessByEmail(ctx, coach.email))?.active === false) throw new Error("Deze coach heeft geen actieve toegang");
  if (args.scheduledAt !== undefined && (!Number.isFinite(args.scheduledAt) || args.scheduledAt < 0 || args.scheduledAt > 8_640_000_000_000_000)) throw new Error("Ongeldige wedstrijddatum");
  if (!args.refereeId) return;
  const referee = await ctx.db.get(args.refereeId);
  if (!referee?.active) throw new Error("Kies een actieve scheidsrechter");
  if (referee.email && (await getUserAccessByEmail(ctx, referee.email))?.active === false) throw new Error("Deze scheidsrechter heeft geen actieve toegang");
  const assigned = await ctx.db.query("matches").withIndex("by_refereeId", q => q.eq("refereeId", args.refereeId)).take(501);
  capacity(assigned, 500, "Scheidsrechterwedstrijden");
  const others = assigned.filter(match => match._id !== args.matchId && match.status !== "finished" && !match.cancelledAt);
  const candidate = args.matchId ? await ctx.db.get(args.matchId) : null;
  if ((candidate?.status === "live" || candidate?.status === "halftime") && others.some(match => match.status === "live" || match.status === "halftime")) throw new Error("Scheidsrechter leidt al een andere actieve wedstrijd");
  if (args.scheduledAt !== undefined && hasScheduleOverlap({ scheduledAt: args.scheduledAt, regulationDurationMinutes: args.regulationDurationMinutes }, others)) throw new Error("Scheidsrechter heeft al een overlappende wedstrijd");
}

export const saveMatchArgs = {
  matchId: v.optional(v.id("matches")), revision: v.optional(v.string()), correlationId: v.string(),
  teamId: v.id("teams"), opponent: v.string(), isHome: v.boolean(), scheduledAt: v.optional(v.number()),
  coachId: v.id("coaches"), refereeId: v.optional(v.id("referees")), quarterCount: v.number(), regulationDurationMinutes: v.number(),
  playerIds: v.array(v.id("players")), starterIds: v.array(v.id("players")), keeperId: v.id("players"),
};
export async function executeAdminSaveMatch(ctx: MutationCtx, args: ObjectType<typeof saveMatchArgs>): Promise<{ matchId: Id<"matches">; deduped: boolean }> {
  const command = await beginCommand(ctx, args.correlationId, "save_match", args);
  if (command.existing) return { matchId: command.existing.resultId as Id<"matches">, deduped: true };
  const opponent = requiredName(args.opponent, "Tegenstander");
  const team = await ctx.db.get(args.teamId);
  if (!team) throw new Error("Team niet gevonden");
  assertValidMatchTiming(args.quarterCount, args.regulationDurationMinutes);
  await validateStaff(ctx, args);
  const selected = new Set(args.playerIds);
  const starters = new Set(args.starterIds);
  if (selected.size !== args.playerIds.length || selected.size < 11 || selected.size > 30) throw new Error("Selecteer 11 tot 30 verschillende spelers");
  if (starters.size !== 11 || args.starterIds.length !== 11 || !starters.has(args.keeperId)) throw new Error("Kies 11 basisspelers, inclusief een keeper");
  for (const id of starters) if (!selected.has(id)) throw new Error("Basisspeler ontbreekt in de selectie");
  for (const id of selected) {
    const player = await ctx.db.get(id);
    if (!player || player.teamId !== args.teamId || !player.active) throw new Error("Een geselecteerde speler is niet actief bij dit team");
  }
  const state = args.matchId ? await readMatchState(ctx, args.matchId) : null;
  if (args.matchId && !state) throw new Error("Wedstrijd niet gevonden");
  if (state) {
    checkRevision(args.revision, state.revision);
    if (state.match.status !== "scheduled" && state.match.status !== "lineup") throw new Error("Wedstrijdgegevens en selectie zijn alleen voor de aftrap te wijzigen");
    if (state.match.startedAt || state.match.homeScore || state.match.awayScore || await ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", state.match._id)).first()) throw new Error("Deze wedstrijd heeft al wedstrijdhistorie en kan niet meer vooraf worden bewerkt");
    if (state.match.teamId !== args.teamId) throw new Error("Het team van een bestaande wedstrijd kan niet worden gewijzigd");
    if (state.match.pitchType === "half" || state.match.formationId?.startsWith("8v8")) throw new Error("Deze wedstrijd heeft een andere veldvorm. Bewerk deze in DIA web.");
    if (state.plans.some(plan => plan.status === "pending" && (!selected.has(plan.playerInId) || !selected.has(plan.playerOutId)))) throw new Error("Een verwijderde speler staat nog in het wisselplan. Pas eerst het wisselplan aan.");
    if (state.plans.some(plan => plan.status === "pending") && (state.match.quarterCount !== args.quarterCount || (state.match.regulationDurationMinutes ?? 60) !== args.regulationDurationMinutes)) throw new Error("Verwijder eerst de geplande wissels voordat je de speeltijd wijzigt");
    const previousStarters = new Set(state.selection.filter(row => row.onField).map(row => row.playerId));
    const previousKeeper = state.selection.find(row => row.onField && row.isKeeper)?.playerId;
    if (state.plans.some(plan => plan.status === "pending") && (previousKeeper !== args.keeperId || previousStarters.size !== starters.size || [...starters].some(id => !previousStarters.has(id)))) throw new Error("Pas eerst het wisselplan aan voordat je de basisopstelling wijzigt");
    if (state.selection.some(row => starters.has(row.playerId) && (row.absent || row.injured))) throw new Error("Een basisspeler is afwezig of geblesseerd. Pas eerst de beschikbaarheid aan.");
  }
  const now = Date.now();
  const fields = {
    opponent, isHome: args.isHome, scheduledAt: args.scheduledAt, coachId: args.coachId, refereeId: args.refereeId,
    quarterCount: args.quarterCount, regulationDurationMinutes: args.regulationDurationMinutes,
    seasonKey: seasonKeyFromMs(args.scheduledAt ?? now),
  };
  let matchId: Id<"matches">;
  if (state) {
    matchId = state.match._id;
    await ctx.db.patch(matchId, { ...fields, ...(state.match.coachId !== args.coachId ? { leadCoachId: args.coachId } : {} ) });
  } else {
    let code: string | undefined;
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      const candidate = generatePublicCode();
      if (!(await ctx.db.query("matches").withIndex("by_code", q => q.eq("publicCode", candidate)).first())) { code = candidate; break; }
    }
    if (!code) throw new Error("Kon geen unieke wedstrijdcode maken");
    matchId = await ctx.db.insert("matches", { ...fields, teamId: args.teamId, publicCode: code, status: "scheduled", currentQuarter: 1, homeScore: 0, awayScore: 0, showLineup: false, leadCoachId: args.coachId, formationId: "11v11_1-4-3-3", pitchType: "full", useBreakClock: true, breakClockAutoStart: false, createdAt: now });
  }
  // Preserve occupied formation slots; assign changed/new starters only to free slots.
  const slotByPlayer = new Map<Id<"players">, number>([[args.keeperId, 0]]);
  const used = new Set([0]);
  for (const row of state?.selection ?? []) {
    const slot = row.fieldSlotIndex;
    if (starters.has(row.playerId) && row.playerId !== args.keeperId && slot !== undefined && Number.isInteger(slot) && slot >= 1 && slot <= 10 && !used.has(slot)) { slotByPlayer.set(row.playerId, slot); used.add(slot); }
  }
  for (const id of args.starterIds) {
    if (slotByPlayer.has(id)) continue;
    const slot = Array.from({ length: 11 }, (_, index) => index).find(index => !used.has(index))!;
    slotByPlayer.set(id, slot); used.add(slot);
  }
  const existing = new Map((state?.selection ?? []).map(row => [row.playerId, row]));
  if (existing.size !== (state?.selection.length ?? 0)) throw new Error("De selectie bevat dubbele spelers. Herstel deze eerst in DIA web.");
  for (const row of state?.selection ?? []) if (!selected.has(row.playerId)) await ctx.db.delete(row._id);
  for (const playerId of selected) {
    const fields = { onField: starters.has(playerId), isKeeper: playerId === args.keeperId, fieldSlotIndex: slotByPlayer.get(playerId) };
    const row = existing.get(playerId);
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert("matchPlayers", { matchId, playerId, ...fields, minutesPlayed: 0, createdAt: now });
  }
  await finishCommand(ctx, command, matchId);
  return { matchId, deduped: false };
}
export const mobileAdminSaveMatch = mutation({ args: saveMatchArgs, returns: v.object({ matchId: v.id("matches"), deduped: v.boolean() }), handler: executeAdminSaveMatch });

export const assignStaffArgs = { matchId: v.id("matches"), revision: v.string(), correlationId: v.string(), coachId: v.id("coaches"), refereeId: v.optional(v.id("referees")) };
export async function executeAdminAssignStaff(ctx: MutationCtx, args: ObjectType<typeof assignStaffArgs>) {
  const command = await beginCommand(ctx, args.correlationId, "assign_staff", args);
  if (command.existing) return { deduped: true };
  const state = await readMatchState(ctx, args.matchId);
  if (!state) throw new Error("Wedstrijd niet gevonden");
  checkRevision(args.revision, state.revision);
  if (state.match.status === "finished") throw new Error("Een afgelopen wedstrijd kan niet opnieuw worden toegewezen");
  await validateStaff(ctx, { ...args, teamId: state.match.teamId, scheduledAt: state.match.scheduledAt, regulationDurationMinutes: state.match.regulationDurationMinutes ?? 60 });
  // An explicit coach reassignment also transfers match leadership; unrelated referee edits do not.
  await ctx.db.patch(args.matchId, { coachId: args.coachId, refereeId: args.refereeId, ...(state.match.coachId !== args.coachId ? { leadCoachId: args.coachId } : {}) });
  await finishCommand(ctx, command, args.matchId);
  return { deduped: false };
}
export const mobileAdminAssignStaff = mutation({ args: assignStaffArgs, returns: v.object({ deduped: v.boolean() }), handler: executeAdminAssignStaff });

export const saveEntityArgs = {
  entity: v.union(v.literal("team"), v.literal("player"), v.literal("coach"), v.literal("referee")),
  correlationId: v.string(), revision: v.string(), contextTeamId: v.optional(v.id("teams")),
  teamId: v.optional(v.id("teams")), playerId: v.optional(v.id("players")), coachId: v.optional(v.id("coaches")), refereeId: v.optional(v.id("referees")), clubId: v.optional(v.id("clubs")),
  name: v.string(), email: v.optional(v.string()), teamIds: v.optional(v.array(v.id("teams"))),
  number: v.optional(v.union(v.number(), v.null())), positionPrimary: v.optional(v.string()), active: v.optional(v.boolean()),
};

/** Merge one role without replacing other roles or reviving explicitly disabled access. */
async function mergeStaffAccess(ctx: MutationCtx, role: "coach" | "referee", email: string, id: Id<"coaches"> | Id<"referees">, active: boolean) {
  const existing = await getUserAccessByEmail(ctx, email);
  if (active && existing?.active === false) throw new Error("Dit e-mailadres heeft geblokkeerde toegang. Herstel dit eerst in DIA web.");
  const linkedId = role === "coach" ? existing?.coachId : existing?.refereeId;
  if (linkedId && linkedId !== id) throw new Error("Dit e-mailadres is al aan een ander rolprofiel gekoppeld. Controleer dit in DIA web.");
  const opposite = role === "coach"
    ? await ctx.db.query("referees").withIndex("by_email", q => q.eq("email", email)).unique()
    : await ctx.db.query("coaches").withIndex("by_email", q => q.eq("email", email)).unique();
  const roles = new Set<AccessRole>(existing?.roles ?? []);
  if (active) roles.add(role); else roles.delete(role);
  let coachId = existing?.coachId;
  let refereeId = existing?.refereeId;
  if (role === "coach") {
    coachId = id as Id<"coaches">;
    if (opposite && "active" in opposite && opposite.active) { roles.add("referee"); refereeId ??= opposite._id as Id<"referees">; }
  } else {
    refereeId = active ? id as Id<"referees"> : undefined;
    if (opposite) { roles.add("coach"); coachId ??= opposite._id as Id<"coaches">; }
  }
  const now = Date.now();
  const fields = { roles: [...roles].sort(), coachId, refereeId, active: existing?.active ?? true, lastSyncedAt: now, updatedAt: now };
  if (existing) await ctx.db.patch(existing._id, fields);
  else await ctx.db.insert("userAccess", { email, ...fields, source: "admin_manual", createdAt: now });
}

export async function executeAdminSaveEntity(ctx: MutationCtx, args: ObjectType<typeof saveEntityArgs>): Promise<{ id: string; deduped: boolean }> {
  const command = await beginCommand(ctx, args.correlationId, "save_entity", args);
  if (command.existing) return { id: command.existing.resultId, deduped: true };
  const catalog = await readAdminCatalog(ctx, args.contextTeamId);
  checkRevision(args.revision, catalog.revision);
  const name = requiredName(args.name);
  const now = Date.now();
  let id: string;
  switch (args.entity) {
    case "team": {
      if (!args.clubId || !await ctx.db.get(args.clubId)) throw new Error("Kies een bestaande club");
      if (args.teamId) {
        const team = await ctx.db.get(args.teamId);
        if (!team) throw new Error("Team niet gevonden");
        if (team.clubId !== args.clubId) throw new Error("De club van een bestaand team kan niet worden gewijzigd");
        await ctx.db.patch(team._id, { name }); id = team._id;
      } else {
        if (catalog.teams.length >= 500) throw new Error("Maximum aantal teams voor mobiel beheer bereikt");
        const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (!base) throw new Error("Gebruik letters of cijfers in de teamnaam");
        let slug = base;
        for (let suffix = 1; ; suffix++) {
          if (!await ctx.db.query("teams").withIndex("by_slug_only", q => q.eq("slug", slug)).first()) break;
          if (suffix > 100) throw new Error("Kies een andere teamnaam");
          slug = `${base}-${suffix + 1}`;
        }
        id = await ctx.db.insert("teams", { name, slug, clubId: args.clubId, createdAt: now });
      }
      break;
    }
    case "player": {
      if (!args.teamId || !await ctx.db.get(args.teamId)) throw new Error("Kies een bestaand team");
      if (args.contextTeamId !== args.teamId) throw new Error("Open eerst de spelerslijst van dit team");
      if (args.number != null && (!Number.isInteger(args.number) || args.number < 1 || args.number > 99)) throw new Error("Rugnummer moet 1 tot 99 zijn");
      const position = args.positionPrimary?.trim().toUpperCase() || undefined;
      if (position && !["GK", "RB", "CB", "LB", "RWB", "LWB", "CDM", "CM", "RM", "LM", "CAM", "RW", "LW", "CF", "ST"].includes(position)) throw new Error("Kies een geldige spelerspositie");
      const player = args.playerId ? await ctx.db.get(args.playerId) : null;
      if (args.playerId && !player) throw new Error("Speler niet gevonden");
      if (player && player.teamId !== args.teamId) throw new Error("Verplaatsen naar een ander team is niet beschikbaar in mobiel beheer");
      const active = args.active ?? player?.active ?? true;
      if (player?.active && !active) {
        const selections = await ctx.db.query("matchPlayers").withIndex("by_player", q => q.eq("playerId", player._id)).take(501);
        capacity(selections, 500, "Spelerwedstrijden");
        const matches = await Promise.all(selections.map(row => ctx.db.get(row.matchId)));
        if (matches.some(match => match?.status === "live" || match?.status === "halftime")) throw new Error("Deze speler staat in een actieve wedstrijd. Wacht met deactiveren tot deze afgelopen is.");
      }
      const fields = { name, active, ...(args.number !== undefined ? { number: args.number ?? undefined } : {}), ...(args.positionPrimary !== undefined ? { positionPrimary: position } : {}) };
      if (player) { await ctx.db.patch(player._id, fields); id = player._id; }
      else {
        if (catalog.players.length >= 200) throw new Error("Maximum aantal spelers voor dit team bereikt");
        id = await ctx.db.insert("players", { ...fields, teamId: args.teamId, createdAt: now });
      }
      break;
    }
    case "coach": {
      const coach = args.coachId ? await ctx.db.get(args.coachId) : null;
      if (args.coachId && !coach) throw new Error("Coach niet gevonden");
      const email = coach ? coach.email : normalizedEmail(args.email);
      if (coach && args.email !== undefined && args.email.trim().toLowerCase() !== (coach.email ?? "")) throw new Error("Het e-mailadres kan alleen in DIA web worden gewijzigd");
      const teamIds = args.teamIds ?? coach?.teamIds ?? [];
      if (teamIds.length > 30 || new Set(teamIds).size !== teamIds.length) throw new Error("Kies maximaal 30 verschillende teams");
      for (const teamId of teamIds) if (!await ctx.db.get(teamId)) throw new Error("Een gekoppeld team bestaat niet meer");
      if (coach) {
        const removed = coach.teamIds.filter(teamId => !teamIds.includes(teamId));
        if (removed.length) {
          const [assigned, led] = await Promise.all([
            ctx.db.query("matches").withIndex("by_coachId", q => q.eq("coachId", coach._id)).take(501),
            ctx.db.query("matches").withIndex("by_leadCoachId", q => q.eq("leadCoachId", coach._id)).take(501),
          ]);
          capacity(assigned, 500, "Coachwedstrijden"); capacity(led, 500, "Geleide wedstrijden");
          if ([...assigned, ...led].some(match => match.status !== "finished" && !match.cancelledAt && removed.includes(match.teamId))) throw new Error("Wijs eerst de open wedstrijden van dit team aan een andere coach toe");
        }
        await ctx.db.patch(coach._id, { name, teamIds }); id = coach._id;
      } else {
        if (catalog.coaches.length >= 500) throw new Error("Maximum aantal coaches voor mobiel beheer bereikt");
        if (await ctx.db.query("coaches").withIndex("by_email", q => q.eq("email", email)).first()) throw new Error("Dit e-mailadres heeft al een coach. Bewerk de bestaande coach.");
        id = await ctx.db.insert("coaches", { name, email, teamIds, createdAt: now });
      }
      if (email) await mergeStaffAccess(ctx, "coach", email, id as Id<"coaches">, true);
      break;
    }
    case "referee": {
      const referee = args.refereeId ? await ctx.db.get(args.refereeId) : null;
      if (args.refereeId && !referee) throw new Error("Scheidsrechter niet gevonden");
      const email = referee ? referee.email : normalizedEmail(args.email);
      if (referee && args.email !== undefined && args.email.trim().toLowerCase() !== (referee.email ?? "")) throw new Error("Het e-mailadres kan alleen in DIA web worden gewijzigd");
      const active = args.active ?? referee?.active ?? true;
      if (referee?.active && !active) {
        const assigned = await ctx.db.query("matches").withIndex("by_refereeId", q => q.eq("refereeId", referee._id)).take(501);
        capacity(assigned, 500, "Scheidsrechterwedstrijden");
        if (assigned.some(match => match.status !== "finished" && !match.cancelledAt)) throw new Error("Verwijder eerst de toewijzingen van open wedstrijden");
      }
      if (referee) { await ctx.db.patch(referee._id, { name, active }); id = referee._id; }
      else {
        if (catalog.referees.length >= 500) throw new Error("Maximum aantal scheidsrechters voor mobiel beheer bereikt");
        if (await ctx.db.query("referees").withIndex("by_email", q => q.eq("email", email)).first()) throw new Error("Dit e-mailadres heeft al een scheidsrechter. Bewerk de bestaande scheidsrechter.");
        id = await ctx.db.insert("referees", { name, email, active, createdAt: now });
      }
      if (email) await mergeStaffAccess(ctx, "referee", email, id as Id<"referees">, active);
      break;
    }
  }
  await finishCommand(ctx, command, id);
  return { id, deduped: false };
}
export const mobileAdminSaveEntity = mutation({ args: saveEntityArgs, returns: v.object({ id: v.string(), deduped: v.boolean() }), handler: executeAdminSaveEntity });
