import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AfterMatchReport } from "@/lib/team-portal/matchReport";
import { AfterMatchReportView } from "./AfterMatchReportView";

function reportFixture(): AfterMatchReport {
  return {
    matchId: "match-1",
    teamName: "DIA JO13-02",
    opponent: "Groenwit JO13",
    homeTeam: "Groenwit JO13",
    awayTeam: "DIA JO13-02",
    isHome: false,
    scheduledAt: Date.UTC(2026, 8, 26, 8, 30),
    score: { home: 2, away: 3, team: 3, opponent: 2, label: "2 – 3" },
    summary: "DIA JO13-02 speelde uit tegen Groenwit JO13. De eindstand was 2 – 3.",
    timeline: [
      { id: "start", type: "period", timeLabel: "0′", periodLabel: "Eerste helft", text: "Eerste helft gestart", detail: null, note: null, playerIds: [] },
      { id: "goal", type: "goal", timeLabel: "12′", periodLabel: "Eerste helft", text: "Doelpunt van Milan", detail: "Stand na dit doelpunt: 0 – 1", note: "Schot vanaf de rand van het strafschopgebied.", playerIds: ["p1"] },
      { id: "assist", type: "assist", timeLabel: "12′", periodLabel: "Eerste helft", text: "Assist van Bo", detail: null, note: null, playerIds: ["p2"] },
      { id: "card", type: "card", timeLabel: "20′", periodLabel: "Eerste helft", text: "Gele kaart voor Sam", detail: null, note: null, playerIds: ["p3"] },
      { id: "sub", type: "substitution", timeLabel: "30′", periodLabel: "Tweede helft", text: "Wissel: Bo erin, Sam eruit", detail: "Geregistreerde wissel", note: null, playerIds: ["p2", "p3"] },
    ],
    players: [
      { playerId: "p1", name: "Milan", number: 8, minutesPlayed: 60, goals: 2, assists: 0, yellowCards: 0, redCards: 0 },
      { playerId: "p3", name: "Sam", number: 4, minutesPlayed: null, goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
      { playerId: "p2", name: "Bo", minutesPlayed: 0, goals: 0, assists: 1, yellowCards: 0, redCards: 0 },
    ],
    recorded: { teamGoals: 2, opponentGoals: 1, assists: 1, substitutions: 2, yellowCards: 1, redCards: 0 },
    completenessNotes: ["Niet alle doelpunten uit de eindstand zijn als afzonderlijk moment geregistreerd.", "Een ontbrekende registratie zegt niets over de inzet of afwezigheid van een speler."],
  };
}

describe("AfterMatchReportView", () => {
  it("shows the final home-away score independently of partial event counts", () => {
    const report = reportFixture();
    render(<AfterMatchReportView report={report} />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Het wedstrijdverslag" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(screen.getByLabelText("Eindstand: Groenwit JO13 2, DIA JO13-02 3")).toHaveTextContent("2 – 3");
    expect(screen.getByText("Uitwedstrijd van DIA JO13-02")).toBeInTheDocument();
    expect(screen.getByText(/zaterdag 26 september 2026 om 10:30/i)).toBeInTheDocument();
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    const summary = within(screen.getByRole("region", { name: "In het kort" }));
    expect(summary.getByText("Geregistreerd bij DIA JO13-02")).toBeInTheDocument();
    expect(summary.getAllByRole("definition").map((item) => item.textContent)).toEqual(["2", "1", "2", "1", "0"]);
  });

  it("renders the chronological recorded timeline and its meaningful notes", () => {
    const report = reportFixture();
    render(<AfterMatchReportView report={report} />);
    const events = within(screen.getByRole("list", { name: "Wedstrijdmomenten op volgorde" })).getAllByRole("listitem");

    expect(events).toHaveLength(5);
    report.timeline.forEach((event, index) => {
      expect(events[index]).toHaveTextContent(event.text);
      expect(events[index]).toHaveTextContent(event.timeLabel);
    });
    expect(within(events[1]).getByText("Vastgelegde notitie")).toBeInTheDocument();
    expect(events[1]).toHaveTextContent("Schot vanaf de rand van het strafschopgebied.");
    expect(events[1]).toHaveTextContent("Stand na dit doelpunt: 0 – 1");
    expect(events[4]).toHaveTextContent("Wissel: Bo erin, Sam eruit");
  });

  it("sorts squad names alphabetically and distinguishes zero from unrecorded minutes", () => {
    render(<AfterMatchReportView report={reportFixture()} />);
    const table = within(screen.getByRole("table", { name: "Geregistreerde speeltijd per speler" }));
    const rows = table.getAllByRole("row").slice(1);

    expect(rows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual(["Bo", "Milan#8", "Sam#4"]);
    expect(within(rows[0]).getByRole("cell")).toHaveTextContent("0 min");
    expect(within(rows[1]).getByRole("cell")).toHaveTextContent("60 min");
    expect(within(rows[2]).getByRole("cell")).toHaveTextContent("Niet geregistreerd");
  });

  it("keeps a score-only report useful and explains missing timeline and selection", () => {
    const report: AfterMatchReport = {
      ...reportFixture(), timeline: [], players: [],
      recorded: { teamGoals: 0, opponentGoals: 0, assists: 0, substitutions: 0, yellowCards: 0, redCards: 0 },
      completenessNotes: ["Alleen de eindstand is beschikbaar. Er zijn geen wedstrijdmomenten vastgelegd."],
    };
    render(<AfterMatchReportView report={report} />);

    expect(screen.getByLabelText("Eindstand: Groenwit JO13 2, DIA JO13-02 3")).toHaveTextContent("2 – 3");
    expect(screen.getByText("Geen wedstrijdmomenten vastgelegd")).toBeInTheDocument();
    expect(screen.getByText("Er is geen wedstrijdselectie vastgelegd voor dit verslag.")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Over de registratie" })).toHaveTextContent(report.completenessNotes[0]);
    expect(screen.queryByRole("list", { name: "Wedstrijdmomenten op volgorde" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows supplied incompleteness notes without displaying unrelated private fields", () => {
    const report = { ...reportFixture(), privateScoutNotes: "Alleen intern: vertrouwelijke scoutobservatie." };
    render(<AfterMatchReportView report={report} />);

    const notes = screen.getByRole("complementary", { name: "Over de registratie" });
    for (const note of report.completenessNotes) expect(notes).toHaveTextContent(note);
    expect(screen.queryByText(report.privateScoutNotes)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("labels an unknown date without inventing a calendar date", () => {
    const report = { ...reportFixture(), scheduledAt: null };
    render(<AfterMatchReportView report={report} />);

    expect(screen.getByText("Datum niet geregistreerd")).toBeInTheDocument();
    expect(screen.queryByText(/januari 1970/)).not.toBeInTheDocument();
  });
});
