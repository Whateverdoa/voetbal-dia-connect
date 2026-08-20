import { describe, expect, it } from "vitest";
import {
  mapSportlinkFixture,
  mergeSportlinkFixtures,
  sportlinkSyntheticVaId,
} from "./sportlinkFixturesMapper";

describe("mapSportlinkFixture", () => {
  it("maps a programma row to staging shape", () => {
    const doc = mapSportlinkFixture({
      wedstrijdcode: 20728026,
      wedstrijddatum: "2026-08-29T08:30:00+02:00",
      aanvangstijd: "08:30",
      thuisteam: "TSC O13-2",
      uitteam: "DIA O13-2JM",
      teamnaam: "DIA O13-2JM",
      status: "Te spelen",
      competitiesoort: "regulier",
      competitie: "Onder 13",
      veld: "veld 3",
      thuisteamlogo: "https://example.com/home.png",
    });

    expect(doc).not.toBeNull();
    expect(doc!.sportlink_wedstrijdcode).toBe("20728026");
    expect(doc!.voetbalassist_id).toBe(sportlinkSyntheticVaId(20728026));
    expect(doc!.status).toBe("gepland");
    expect(doc!.dia_team).toBe("jo13-2");
    expect(doc!.thuisteam).toBe("TSC O13-2");
    expect(doc!.datum_ms).toBe(Date.parse("2026-08-29T08:30:00+02:00"));
  });

  it("maps uitslagen scores", () => {
    const doc = mapSportlinkFixture({
      wedstrijdcode: 20515764,
      wedstrijddatum: "2026-05-29T19:30:00+02:00",
      thuisteam: "DIA 35+3",
      uitteam: "Terheijden 35+3",
      teamnaam: "DIA 35+3",
      status: "Uitgespeeld",
      competitiesoort: "regulier",
      uitslag: "3 - 0",
    });

    expect(doc?.status).toBe("gespeeld");
    expect(doc?.thuis_goals).toBe(3);
    expect(doc?.uit_goals).toBe(0);
    expect(doc?.dia_team).toBe("35-3");
  });

  it("skips trainings", () => {
    expect(
      mapSportlinkFixture({
        wedstrijdcode: 1,
        wedstrijddatum: "2026-08-22T09:00:00+02:00",
        thuisteam: "DIA JO15-1",
        uitteam: "DIA JO15-1",
        competitiesoort: "Training",
        status: "Te spelen",
      }),
    ).toBeNull();
  });
});

describe("mergeSportlinkFixtures", () => {
  it("lets uitslagen overwrite programma for the same code", () => {
    const map = mergeSportlinkFixtures([
      {
        wedstrijdcode: 99,
        wedstrijddatum: "2026-08-01T15:00:00+02:00",
        thuisteam: "DIA JO15-1",
        uitteam: "Rival JO15-1",
        status: "Te spelen",
        competitiesoort: "regulier",
      },
      {
        wedstrijdcode: 99,
        wedstrijddatum: "2026-08-01T15:00:00+02:00",
        thuisteam: "DIA JO15-1",
        uitteam: "Rival JO15-1",
        status: "Uitgespeeld",
        competitiesoort: "regulier",
        uitslag: "2 - 1",
      },
    ]);
    const doc = map.get("99");
    expect(doc?.status).toBe("gespeeld");
    expect(doc?.thuis_goals).toBe(2);
    expect(doc?.uit_goals).toBe(1);
  });
});
