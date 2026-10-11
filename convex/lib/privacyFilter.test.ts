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
  it("shows first name without last name when consents are pending", () => {
    const out = redactPlayerForPublic(player, []);
    expect(out.displayName).toBe("Jan");
    expect(out.showFullIdentity).toBe(false);
    expect(out.photoUrl).toBeNull();
    expect(out.cardProfile).toBeNull();
    expect(out.number).toBe(7);
  });

  it("shows photo and XP when those consents are granted", () => {
    const consents: ConsentRow[] = [
      { consentType: "public_display", status: "granted" },
      { consentType: "photo", status: "granted" },
      { consentType: "gamification", status: "granted" },
    ];
    const out = redactPlayerForPublic(player, consents);
    expect(out.displayName).toBe("Jan");
    expect(out.photoUrl).toBe(player.photoUrl);
    expect(out.cardProfile?.xp).toBe(100);
    expect(out.showFullIdentity).toBe(false);
  });

  it("keeps first name only even with public_display granted", () => {
    const consents: ConsentRow[] = [
      { consentType: "public_display", status: "granted" },
    ];
    const out = redactPlayerForPublic(player, consents);
    expect(out.displayName).toBe("Jan");
    expect(out.showFullIdentity).toBe(false);
  });

  it("falls back to initials when public_display is revoked", () => {
    const consents: ConsentRow[] = [
      { consentType: "public_display", status: "revoked" },
      { consentType: "photo", status: "granted" },
    ];
    const out = redactPlayerForPublic(player, consents);
    expect(out.displayName).toBe("JJ");
    expect(out.photoUrl).toBeNull();
  });

  it.each([false, true])("requires public display permission for every game field (granted=%s)", (publicOk) => {
    const consents: ConsentRow[] = [
      { consentType: "public_display", status: publicOk ? "granted" : "pending" },
      { consentType: "photo", status: "granted" },
      { consentType: "gamification", status: "granted" },
    ];
    const fcRatings = { snl: 80, sch: 80, pas: 80, dri: 80, vrd: 80, fys: 80 };
    const recognitions = [{ roundId: "r1", kind: "week" as const, periodKey: "2026-10-05", publishedAt: 1, expiresAt: 2 }];
    const out = redactPlayerForPublic({ ...player, fcRatings, playStyleIds: ["dribbler"], recognitions }, consents);
    expect(out.fcRatings).toEqual(publicOk ? fcRatings : null);
    expect(out.playStyleIds).toEqual(publicOk ? ["dribbler"] : []);
    expect(out.recognitions).toEqual(publicOk ? recognitions : []);
    expect(out.photoUrl).toBe(publicOk ? player.photoUrl : null);
    expect(out.cardProfile?.seasonStats ?? {}).not.toHaveProperty("minutes");
  });

  it("hides revoked data even if a stale granted row exists", () => {
    const out = redactPlayerForPublic(player, [
      { consentType: "public_display", status: "granted" },
      { consentType: "public_display", status: "revoked" },
      { consentType: "photo", status: "granted" },
      { consentType: "gamification", status: "granted" },
    ]);
    expect(out.displayName).toBe("JJ");
    expect(out.photoUrl).toBeNull();
    expect(out.cardProfile).toBeNull();
  });
});
