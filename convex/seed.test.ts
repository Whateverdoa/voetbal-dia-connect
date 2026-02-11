import { describe, it, expect } from 'vitest';
import { DUTCH_NAMES, generatePublicCode, pickUniqueNames } from './seed/helpers';
import { TEAM_CONFIGS, COACH_CONFIGS, REFEREE_CONFIGS, PLAYERS_PER_TEAM } from './seed/seedData';

// Note: The actual Convex action (seed:init) requires integration testing
// with a real Convex backend. These tests cover the pure helper functions
// and verify seed data configuration consistency.

describe('Seed Helpers', () => {
  describe('pickUniqueNames', () => {
    it('picks the requested number of names', () => {
      const used = new Set<string>();
      const names = pickUniqueNames(PLAYERS_PER_TEAM, used);
      expect(names).toHaveLength(PLAYERS_PER_TEAM);
    });

    it('returns unique names within a batch', () => {
      const used = new Set<string>();
      const names = pickUniqueNames(PLAYERS_PER_TEAM, used);
      const unique = new Set(names);
      expect(unique.size).toBe(PLAYERS_PER_TEAM);
    });

    it('tracks used names across multiple teams', () => {
      const used = new Set<string>();
      const t1 = pickUniqueNames(PLAYERS_PER_TEAM, used);
      const t2 = pickUniqueNames(PLAYERS_PER_TEAM, used);
      const t3 = pickUniqueNames(PLAYERS_PER_TEAM, used);

      const all = [...t1, ...t2, ...t3];
      const unique = new Set(all);
      expect(unique.size).toBe(PLAYERS_PER_TEAM * 3);
    });

    it('does not reuse names from previous teams', () => {
      const used = new Set<string>();
      const t1Names = new Set(pickUniqueNames(PLAYERS_PER_TEAM, used));
      const t2 = pickUniqueNames(PLAYERS_PER_TEAM, used);

      t2.forEach((name) => {
        expect(t1Names.has(name)).toBe(false);
      });
    });
  });

  describe('generatePublicCode', () => {
    it('generates a 6-character code', () => {
      expect(generatePublicCode()).toHaveLength(6);
    });

    it('uses only uppercase letters and digits', () => {
      expect(generatePublicCode()).toMatch(/^[A-Z0-9]+$/);
    });

    it('excludes ambiguous characters (O, 0, I, 1)', () => {
      for (let i = 0; i < 100; i++) {
        const code = generatePublicCode();
        expect(code).not.toContain('O');
        expect(code).not.toContain('0');
        expect(code).not.toContain('I');
        expect(code).not.toContain('1');
      }
    });

    it('generates different codes on multiple calls', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(generatePublicCode());
      }
      expect(codes.size).toBe(50);
    });
  });

  describe('DUTCH_NAMES constant', () => {
    it('has enough names for all teams', () => {
      const needed = TEAM_CONFIGS.length * PLAYERS_PER_TEAM;
      expect(DUTCH_NAMES.length).toBeGreaterThanOrEqual(needed);
    });

    it('has no duplicate names', () => {
      const unique = new Set(DUTCH_NAMES);
      expect(unique.size).toBe(DUTCH_NAMES.length);
    });

    it('all names are non-empty strings', () => {
      DUTCH_NAMES.forEach((name) => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Seed Data Configuration', () => {
  describe('Team configuration', () => {
    it('has 3 teams', () => {
      expect(TEAM_CONFIGS).toHaveLength(3);
    });

    it('uses correct Dutch youth team naming (JO = Jeugd Onder)', () => {
      TEAM_CONFIGS.forEach((team) => {
        expect(team.name).toMatch(/^JO\d{2}-\d$/);
      });
    });

    it('slugs are lowercase versions of names', () => {
      TEAM_CONFIGS.forEach((team) => {
        expect(team.slug).toBe(team.name.toLowerCase());
      });
    });
  });

  describe('Coach configuration', () => {
    it('has 4 coaches', () => {
      expect(COACH_CONFIGS).toHaveLength(4);
    });

    it('PINs are 4 digits', () => {
      COACH_CONFIGS.forEach((coach) => {
        expect(coach.pin).toMatch(/^\d{4}$/);
      });
    });

    it('PINs are unique', () => {
      const pins = COACH_CONFIGS.map((c) => c.pin);
      const unique = new Set(pins);
      expect(unique.size).toBe(COACH_CONFIGS.length);
    });

    it('all teamSlugs reference valid teams', () => {
      const slugs = new Set(TEAM_CONFIGS.map((t) => t.slug));
      COACH_CONFIGS.forEach((coach) => {
        coach.teamSlugs.forEach((slug) => {
          expect(slugs.has(slug)).toBe(true);
        });
      });
    });
  });

  describe('Referee configuration', () => {
    it('has 4 referees', () => {
      expect(REFEREE_CONFIGS).toHaveLength(4);
    });

    it('PINs are 4 digits', () => {
      REFEREE_CONFIGS.forEach((ref) => {
        expect(ref.pin).toMatch(/^\d{4}$/);
      });
    });

    it('PINs are unique among referees', () => {
      const pins = REFEREE_CONFIGS.map((r) => r.pin);
      const unique = new Set(pins);
      expect(unique.size).toBe(REFEREE_CONFIGS.length);
    });

    it('PINs do not overlap with coach PINs', () => {
      const coachPins = new Set(COACH_CONFIGS.map((c) => c.pin));
      REFEREE_CONFIGS.forEach((ref) => {
        expect(coachPins.has(ref.pin)).toBe(false);
      });
    });
  });
});
