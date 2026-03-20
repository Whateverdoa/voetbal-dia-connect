export interface CompetitionStanding {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface CompetitionProvider {
  source: "sportlink";
  refreshIntervalMinutes: number;
  fetchStandings(competitionCode: string): Promise<CompetitionStanding[]>;
}

export interface SportlinkConfig {
  baseUrl: string;
  clientId: string;
  refreshIntervalMinutes: number;
}

export function getSportlinkConfigFromEnv(
  env: Record<string, string | undefined>
): SportlinkConfig | null {
  const clientId = env.SPORTLINK_CLIENT_ID?.trim();
  if (!clientId) return null;

  const baseUrl = env.SPORTLINK_BASE_URL?.trim() || "https://data.sportlink.com";
  const refreshIntervalRaw = Number(env.SPORTLINK_REFRESH_MINUTES ?? "5");
  const refreshIntervalMinutes = Number.isFinite(refreshIntervalRaw)
    ? Math.max(1, Math.floor(refreshIntervalRaw))
    : 5;

  return {
    baseUrl,
    clientId,
    refreshIntervalMinutes,
  };
}
