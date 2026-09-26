import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LocalDemoRoster } from "@/lib/team-portal/localRoster";
import { LocalTeamSchedule } from "./LocalTeamSchedule";

const importedAt = "2026-09-26T08:00:00.000Z";
type LocalMatch = NonNullable<LocalDemoRoster["matches"]>[number];

function match(overrides: Partial<LocalMatch>): LocalMatch {
  return {
    id: "match-1", opponent: "Gastclub JO13-1", scheduledAt: Date.parse("2026-09-27T08:30:00Z"),
    isHome: true, status: "scheduled", homeScore: 0, awayScore: 0, participantIds: ["player-1"], ...overrides,
  };
}

function roster(overrides: Partial<LocalDemoRoster> = {}): LocalDemoRoster {
  return {
    version: 1, teamSlug: "jo13-2", importedAt,
    players: [{ id: "player-1", name: "Speler A", number: 2, position: "Verdediger" }],
    ...overrides,
  };
}

const standings: NonNullable<LocalDemoRoster["standings"]> = {
  competitionName: "JO13 competitie", klassepoule: "2e klasse 04", sportlinkTeamName: "DIA JO13-2",
  fetchedAt: Date.parse("2026-09-25T12:00:00Z"),
  rows: [
    { position: 2, teamName: "DIA JO13-2", played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 12, goalsAgainst: 8, goalDifference: 4, points: 7 },
    { position: 1, teamName: "DIA JO13-1", played: 4, won: 3, drawn: 1, lost: 0, goalsFor: 15, goalsAgainst: 4, goalDifference: 11, points: 10 },
    { position: 3, teamName: "Andere club JO13-2", played: 4, won: 1, drawn: 0, lost: 3, goalsFor: 5, goalsAgainst: 20, goalDifference: -15, points: 3 },
  ],
};

describe("local team schedule", () => {
  it("uses the actual home and away order without reversing the recorded score", () => {
    render(<LocalTeamSchedule roster={roster({ matches: [
      match({ id: "home", opponent: "Thuisgast JO13-1", status: "finished", homeScore: 3, awayScore: 1 }),
      match({ id: "away", opponent: "Uitgast JO13-1", status: "finished", isHome: false, homeScore: 2, awayScore: 5 }),
    ] })} />);
    const home = screen.getByRole("heading", { name: "DIA JO13-2 – Thuisgast JO13-1" }).closest("article")!;
    const away = screen.getByRole("heading", { name: "Uitgast JO13-1 – DIA JO13-2" }).closest("article")!;
    expect(within(home).getByLabelText("Uitslag: 3 – 1")).toBeInTheDocument();
    expect(within(home).getByText(/Thuis$/)).toBeInTheDocument();
    expect(within(away).getByLabelText("Uitslag: 2 – 5")).toBeInTheDocument();
    expect(within(away).getByText(/Uit$/)).toBeInTheDocument();
  });

  it.each(["scheduled", "lineup"] as const)("does not invent a 0–0 score for a %s fixture", (status) => {
    render(<LocalTeamSchedule roster={roster({ matches: [match({ status })] })} />);
    expect(screen.queryByText("0 – 0")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Uitslag:|Stand bij ophalen:/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DIA JO13-2 – Gastclub JO13-1" })).toBeInTheDocument();
  });

  it.each(["live", "halftime"] as const)("labels a captured %s score as a snapshot", (status) => {
    render(<LocalTeamSchedule roster={roster({ matches: [match({ status, homeScore: 1, awayScore: 2 })] })} />);
    expect(screen.getByLabelText("Stand bij ophalen: 1 – 2")).toBeInTheDocument();
    expect(screen.getByText(status === "live" ? "Bezig bij ophalen" : "Rust bij ophalen")).toBeInTheDocument();
  });

  it("orders upcoming fixtures ascending and finished results descending without mutating the source", () => {
    const matches = [
      match({ id: "late", opponent: "Latere wedstrijd", scheduledAt: Date.parse("2026-10-03T08:00:00Z") }),
      match({ id: "old", opponent: "Oudere uitslag", status: "finished", scheduledAt: Date.parse("2026-09-12T08:00:00Z") }),
      match({ id: "next", opponent: "Eerste wedstrijd", scheduledAt: Date.parse("2026-09-27T08:00:00Z") }),
      match({ id: "recent", opponent: "Nieuwste uitslag", status: "finished", scheduledAt: Date.parse("2026-09-19T08:00:00Z") }),
    ];
    render(<LocalTeamSchedule roster={roster({ matches })} />);
    expect(within(screen.getByRole("region", { name: "Programma" })).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["DIA JO13-2 – Eerste wedstrijd", "DIA JO13-2 – Latere wedstrijd"]);
    expect(within(screen.getByRole("region", { name: "Uitslagen" })).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["DIA JO13-2 – Nieuwste uitslag", "DIA JO13-2 – Oudere uitslag"]);
    expect(matches.map((entry) => entry.id)).toEqual(["late", "old", "next", "recent"]);
  });

  it("shows only the latest result and nearest future fixture in the compact view", () => {
    render(<LocalTeamSchedule compact roster={roster({ matches: [
      match({ id: "late", opponent: "Later", scheduledAt: Date.parse("2026-10-03T08:00:00Z") }),
      match({ id: "stale", opponent: "Verouderd programma", scheduledAt: Date.parse("2026-09-25T08:00:00Z") }),
      match({ id: "first", opponent: "Volgende", scheduledAt: Date.parse("2026-09-27T08:00:00Z") }),
      match({ id: "old", opponent: "Oud", status: "finished", scheduledAt: Date.parse("2026-09-12T08:00:00Z") }),
      match({ id: "last", opponent: "Laatste", status: "finished", scheduledAt: Date.parse("2026-09-19T08:00:00Z") }),
    ] })} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["DIA JO13-2 – Volgende", "DIA JO13-2 – Laatste"]);
    expect(screen.queryByText(/Verouderd programma/)).not.toBeInTheDocument();
  });

  it("explains missing schedule, results and standings", () => {
    render(<LocalTeamSchedule roster={roster()} />);
    expect(screen.getByText(/nog geen wedstrijden op het programma/)).toBeInTheDocument();
    expect(screen.getByText(/nog geen uitslagen bekend/)).toBeInTheDocument();
    expect(screen.getByText("De competitiestand is nog niet opgehaald.")).toBeInTheDocument();
  });

  it("explains missing compact fixtures rather than showing made-up examples", () => {
    render(<LocalTeamSchedule compact roster={roster({ matches: [] })} />);
    expect(screen.getByText(/nog geen volgende wedstrijd bekend/)).toBeInTheDocument();
    expect(screen.getByText(/nog geen gespeelde wedstrijd bekend/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("displays independent match import and standings refresh timestamps in Dutch local time", () => {
    render(<LocalTeamSchedule roster={roster({ standings })} />);
    expect(screen.getByText("26 september 2026 om 10:00")).toHaveAttribute("datetime", importedAt);
    expect(screen.getByText("25 september 2026 om 14:00")).toHaveAttribute("datetime", "2026-09-25T12:00:00.000Z");
    expect(screen.getByText(/niet automatisch bijgewerkt/)).toBeInTheDocument();
  });

  it("sorts the standing and highlights only the exactly matched team", () => {
    render(<LocalTeamSchedule roster={roster({ standings })} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual(["DIA JO13-1", "DIA JO13-2", "Andere club JO13-2"]);
    expect(rows[0]).not.toHaveAttribute("aria-current");
    expect(rows[1]).toHaveAttribute("aria-current", "true");
    expect(rows[2]).not.toHaveAttribute("aria-current");
    expect(within(rows[1]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["2", "4", "2", "1", "1", "12", "8", "4", "7"]);
  });

  it("summarizes the team's own standing when compact", () => {
    render(<LocalTeamSchedule compact roster={roster({ standings })} />);
    expect(screen.getByText("DIA JO13-2 · positie 2 · 7 punten uit 4 wedstrijden")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("DIA JO13-1")).not.toBeInTheDocument();
  });

  it("does not substitute a similarly named team when the exact team is missing", () => {
    render(<LocalTeamSchedule compact roster={roster({ standings: { ...standings, sportlinkTeamName: "DIA JO13-02" } })} />);
    expect(screen.getByText("De positie van DIA JO13-02 is niet bekend in deze stand.")).toBeInTheDocument();
    expect(screen.queryByText(/punten uit/)).not.toBeInTheDocument();
  });

  it("explains an available standings source with no rows", () => {
    render(<LocalTeamSchedule roster={roster({ standings: { ...standings, rows: [] } })} />);
    expect(screen.getByText("Er zijn nog geen teams opgenomen in deze competitiestand.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
