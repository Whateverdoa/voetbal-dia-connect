import type { Doc } from "../_generated/dataModel";

/**
 * Logo URLs for coach/referee/admin UIs (same semantics as public `getByPublicCode`).
 */
export function logoFieldsForMatchWithTeamClub(
  match: Doc<"matches">,
  team: Doc<"teams"> | null,
  club: Doc<"clubs"> | null,
): {
  teamLogoUrl: string | undefined;
  clubLogoUrl: string | undefined;
  opponentLogoUrl: string | undefined;
} {
  return {
    teamLogoUrl: team?.logoUrl,
    clubLogoUrl: club?.logoUrl,
    opponentLogoUrl: match.opponentLogoUrl,
  };
}
