import {
  CompetitionProvider,
  CompetitionStanding,
  SportlinkConfig,
} from "./provider";

function parseStandings(payload: unknown): CompetitionStanding[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const value = row as Record<string, unknown>;
      return {
        teamName: String(value.teamName ?? ""),
        played: Number(value.played ?? 0),
        won: Number(value.won ?? 0),
        drawn: Number(value.drawn ?? 0),
        lost: Number(value.lost ?? 0),
        goalsFor: Number(value.goalsFor ?? 0),
        goalsAgainst: Number(value.goalsAgainst ?? 0),
        points: Number(value.points ?? 0),
      };
    })
    .filter((row): row is CompetitionStanding => row !== null && row.teamName !== "");
}

export function createSportlinkProvider(
  config: SportlinkConfig
): CompetitionProvider {
  return {
    source: "sportlink",
    refreshIntervalMinutes: config.refreshIntervalMinutes,
    async fetchStandings(competitionCode: string): Promise<CompetitionStanding[]> {
      const url = new URL(`/clubdataservice/standings/${competitionCode}`, config.baseUrl);
      url.searchParams.set("client_id", config.clientId);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Sportlink request failed: ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      return parseStandings(payload);
    },
  };
}
