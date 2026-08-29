import { describe, expect, it } from "vitest";
import {
  helpAdminPage,
  helpClubRollenPage,
  helpCoachPage,
  helpIndexPage,
  helpIntroCards,
  helpRefereePage,
} from "./copy";

function headings(page: { blocks: { heading: string }[] }): string[] {
  return page.blocks.map((block) => block.heading);
}

describe("help handleiding", () => {
  it("lists coach, scheidsrechter and admin as intro cards", () => {
    const titles = helpIntroCards.map((card) => card.title);
    expect(titles).toEqual(
      expect.arrayContaining(["Coach", "Scheidsrechter", "Admin / TC"]),
    );
  });

  it("explains how the parts work together on the index", () => {
    expect(headings(helpIndexPage)).toEqual(
      expect.arrayContaining([
        "Hoe de onderdelen samenwerken",
        "Een speeldag, stap voor stap",
      ]),
    );
  });

  it("covers coach lineup, clock split and access", () => {
    expect(headings(helpCoachPage)).toEqual(
      expect.arrayContaining([
        "Wat is jouw rol",
        "Voor de aftrap",
        "Wie bedient de klok",
        "Geen toegang of lege lijst",
      ]),
    );
  });

  it("covers referee claim round and clock", () => {
    expect(headings(helpRefereePage)).toEqual(
      expect.arrayContaining([
        "Claimronde",
        "Tijdens de wedstrijd",
        "Wat jij niet hoeft te doen",
      ]),
    );
  });

  it("covers admin assignment, access and control mode", () => {
    expect(headings(helpAdminPage)).toEqual(
      expect.arrayContaining([
        "Toewijzing",
        "Toegang geven",
        "Alles controleren (deze fase)",
      ]),
    );
  });

  it("explains email as the key between roles", () => {
    expect(headings(helpClubRollenPage)).toContain("E-mail is de sleutel");
  });
});
