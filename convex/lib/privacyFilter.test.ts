import { describe, expect, it } from "vitest";
import { redactPlayerForPublic, type ConsentRow } from "./privacyFilter";

const player = {
  _id: "p1",
  name: "Jan Jansen",
  number: 7,
  positionPrimary: "CM",
  photoUrl: "https://example.com/jan.jpg",
  cardProfile: {
    xp: 100,
    level: 3,
    rarity: "common" as const,
    seasonStats: {
      matches: 5,
      minutes: 200,
      goals: 2,
      assists: 1,
      cleanSheets: 0,
    },
    badges: ["first_goal"],
  },
};

describe("redactPlayerForPublic", () => {
  it("hides name, photo and XP without public_display", () => {
    const consents: ConsentRow[] = [
      { consentType: "photo", status: "granted" },
      { consentType: "gamification", status: "granted" },
    ];
    const out = redactPlayerForPublic(player, consents);
    expect(out.displayName).toBe("JJ");
    expect(out.photoUrl).toBeNull();
    expect(out.cardProfile).toBeNull();
    expect(out.showFullIdentity).toBe(false);
    expect(out.number).toBe(7);
  });

  it("shows name but not photo/XP when only public_display granted", () => {
    const consents: ConsentRow[] = [
      { consentType: "public_display", status: "granted" },
    ];
    const out = redactPlayerForPublic(player, consents);
    expect(out.displayName).toBe("Jan Jansen");
    expect(out.photoUrl).toBeNull();
    expect(out.cardProfile).toBeNull();
    expect(out.showFullIdentity).toBe(true);
  });

  it("shows photo and XP when all consents granted", () => {
    const consents: ConsentRow[] = [
      { consentType: "public_display", status: "granted" },
      { consentType: "photo", status: "granted" },
      { consentType: "gamification", status: "granted" },
    ];
    const out = redactPlayerForPublic(player, consents);
    expect(out.photoUrl).toBe(player.photoUrl);
    expect(out.cardProfile?.xp).toBe(100);
    expect(out.showFullIdentity).toBe(true);
  });

  it("treats revoked as not granted", () => {
    const consents: ConsentRow[] = [
      { consentType: "public_display", status: "revoked" },
      { consentType: "photo", status: "granted" },
    ];
    const out = redactPlayerForPublic(player, consents);
    expect(out.displayName).toBe("JJ");
    expect(out.photoUrl).toBeNull();
  });
});
