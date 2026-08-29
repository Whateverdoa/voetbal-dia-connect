import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { isActiveSeasonMatch } from "./season";
import { logoFieldsForMatchWithTeamClub } from "./matchLogoFields";

const ADMIN_MATCH_TAKE = 500;

export type AdminViewMatchRow = {
  match: Doc<"matches">;
  teamName: string;
  logos: ReturnType<typeof logoFieldsForMatchWithTeamClub>;
};

export async function listSeasonMatchesForAdminView(
  ctx: QueryCtx,
  seasonKey: string,
): Promise<{
  rows: AdminViewMatchRow[];
  teams: { id: Doc<"teams">["_id"]; name: string }[];
}> {
  const recent = await ctx.db
    .query("matches")
    .withIndex("by_createdAt")
    .order("desc")
    .take(ADMIN_MATCH_TAKE);

  const matches = recent.filter((match) =>
    isActiveSeasonMatch(match, seasonKey),
  );

  const teamIds = [...new Set(matches.map((match) => match.teamId))];
  const teamDocs = await Promise.all(teamIds.map((id) => ctx.db.get(id)));
  const teamById = new Map(
    teamDocs
      .filter((team): team is Doc<"teams"> => team !== null)
      .map((team) => [team._id, team]),
  );

  const clubIds = [
    ...new Set([...teamById.values()].map((team) => team.clubId)),
  ];
  const clubDocs = await Promise.all(clubIds.map((id) => ctx.db.get(id)));
  const clubById = new Map(
    clubDocs
      .filter((club): club is Doc<"clubs"> => club !== null)
      .map((club) => [club._id, club]),
  );

  const rows = matches.map((match) => {
    const teamDoc = teamById.get(match.teamId) ?? null;
    const club = teamDoc ? (clubById.get(teamDoc.clubId) ?? null) : null;
    return {
      match,
      teamName: teamDoc?.name ?? "Team",
      logos: logoFieldsForMatchWithTeamClub(match, teamDoc, club),
    };
  });

  const teams = [...teamById.values()]
    .map((team) => ({ id: team._id, name: team.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));

  return { rows, teams };
}
