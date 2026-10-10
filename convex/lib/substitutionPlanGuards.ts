type MatchStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";

export function assertCanExecutePlannedSubstitution(status: MatchStatus): void {
  if (status === "finished") {
    throw new Error("Wissels zijn gesloten — wedstrijd is afgelopen");
  }
  if (status !== "live" && status !== "halftime") {
    throw new Error("Geplande wissels kun je pas tijdens de wedstrijd bevestigen");
  }
}
