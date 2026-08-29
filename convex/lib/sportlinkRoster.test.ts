import { describe, expect, it } from "vitest";
import {
  displayNameFromIndeling,
  parseIndelingRows,
  slugFromSportlinkTeamName,
  sportlinkTeamKey,
} from "./sportlinkRoster";

describe("sportlinkRoster", () => {
  it("maps JO / O team names to slugs", () => {
    expect(slugFromSportlinkTeamName("JO13-1")).toBe("jo13-1");
    expect(slugFromSportlinkTeamName("DIA O13-2JM")).toBe("jo13-2");
    expect(slugFromSportlinkTeamName("JO13-2JM")).toBe("jo13-2");
    expect(slugFromSportlinkTeamName("DIA 1")).toBeNull();
  });

  it("builds sportlink keys", () => {
    expect(sportlinkTeamKey(-1, 171)).toBe("local:171");
    expect(sportlinkTeamKey(297796, -1)).toBe("bond:297796");
  });

  it("skips shielded player names", () => {
    const people = parseIndelingRows([
      {
        naam: "Afgeschermd",
        voornaam: "Afgeschermd",
        achternaam: "Afgeschermd",
        rol: "Teamspeler",
      },
      {
        naam: "Betten, Ilya",
        voornaam: "Ilya",
        achternaam: "Betten",
        rol: "Technische staf",
        functie: "Trainer",
      },
    ]);
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({
      displayName: "Ilya Betten",
      kind: "coach",
    });
  });

  it("formats display names", () => {
    expect(
      displayNameFromIndeling({
        naam: "Haaften, Dexx van",
        voornaam: "Dexx",
        achternaam: "Haaften",
        tussenvoegsel: "van",
        rol: "Teamspeler",
      })
    ).toBe("Dexx van Haaften");
  });
});
