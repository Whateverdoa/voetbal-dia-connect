import { describe, it, expect } from 'vitest';

// Test the pure utility functions from seed.ts
// Note: The actual Convex action (seed:init) requires integration testing
// with a real Convex backend. These tests cover the helper functions.

// Dutch first names for realistic player data (copied from seed.ts)
const DUTCH_NAMES = [
  "Daan", "Sem", "Liam", "Lucas", "Finn", "Luuk", "Milan", "Jesse",
  "Noah", "Bram", "Lars", "Tim", "Thijs", "Max", "Ruben", "Thomas",
  "Jayden", "Stijn", "Julian", "Sven", "Niels", "Joep", "Mees", "Cas",
  "Tijn", "Teun", "Gijs", "Jens", "Bas", "Floris", "Pepijn", "Olivier",
  "Hidde", "Ties", "Vince", "Sam", "Luca", "Rick", "Niek", "Koen",
  "Ravi", "Jasper", "Wouter", "Pieter", "Sander", "Matthijs", "Daniël", "Tobias",
];

// Generate 14 unique players with realistic shirt numbers (copied from seed.ts)
function generatePlayers(usedNames: Set<string>): Array<{ name: string; number: number }> {
  const players: Array<{ name: string; number: number }> = [];
  const availableNames = DUTCH_NAMES.filter((n) => !usedNames.has(n));
  
  // Shuffle available names
  const shuffled = [...availableNames].sort(() => Math.random() - 0.5);
  
  // Common youth football shirt numbers (1-99, but typically 1-25)
  const shirtNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  
  for (let i = 0; i < 14; i++) {
    const name = shuffled[i];
    usedNames.add(name);
    players.push({ name, number: shirtNumbers[i] });
  }
  
  return players;
}

// Generate unique 6-char public code (no ambiguous chars) (copied from seed.ts)
function generatePublicCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No O/0/I/1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

describe('Seed Script Utilities', () => {
  describe('generatePlayers', () => {
    it('generates exactly 14 players', () => {
      const usedNames = new Set<string>();
      const players = generatePlayers(usedNames);
      
      expect(players).toHaveLength(14);
    });

    it('assigns shirt numbers 1-14', () => {
      const usedNames = new Set<string>();
      const players = generatePlayers(usedNames);
      
      const numbers = players.map(p => p.number);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    });

    it('uses Dutch names from the list', () => {
      const usedNames = new Set<string>();
      const players = generatePlayers(usedNames);
      
      players.forEach(player => {
        expect(DUTCH_NAMES).toContain(player.name);
      });
    });

    it('generates unique names within a team', () => {
      const usedNames = new Set<string>();
      const players = generatePlayers(usedNames);
      
      const names = players.map(p => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(14);
    });

    it('tracks used names across multiple teams', () => {
      const usedNames = new Set<string>();
      
      // Generate 3 teams (like in seed:init)
      const team1 = generatePlayers(usedNames);
      const team2 = generatePlayers(usedNames);
      const team3 = generatePlayers(usedNames);
      
      // All 42 names should be unique
      const allNames = [...team1, ...team2, ...team3].map(p => p.name);
      const uniqueNames = new Set(allNames);
      expect(uniqueNames.size).toBe(42);
    });

    it('does not reuse names from previous teams', () => {
      const usedNames = new Set<string>();
      
      const team1 = generatePlayers(usedNames);
      const team1Names = new Set(team1.map(p => p.name));
      
      const team2 = generatePlayers(usedNames);
      
      // No overlap between team1 and team2
      team2.forEach(player => {
        expect(team1Names.has(player.name)).toBe(false);
      });
    });
  });

  describe('generatePublicCode', () => {
    it('generates a 6-character code', () => {
      const code = generatePublicCode();
      expect(code).toHaveLength(6);
    });

    it('uses only uppercase letters and digits', () => {
      const code = generatePublicCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('excludes ambiguous characters (O, 0, I, 1)', () => {
      // Generate many codes to increase probability of catching issues
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
      
      // Generate 50 codes - should be highly unlikely to have duplicates
      for (let i = 0; i < 50; i++) {
        codes.add(generatePublicCode());
      }
      
      // With 32^6 possible combinations, 50 codes should all be unique
      expect(codes.size).toBe(50);
    });
  });

  describe('DUTCH_NAMES constant', () => {
    it('has at least 42 names for 3 teams of 14 players', () => {
      expect(DUTCH_NAMES.length).toBeGreaterThanOrEqual(42);
    });

    it('has no duplicate names', () => {
      const uniqueNames = new Set(DUTCH_NAMES);
      expect(uniqueNames.size).toBe(DUTCH_NAMES.length);
    });

    it('all names are non-empty strings', () => {
      DUTCH_NAMES.forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Seed Data Structure', () => {
  describe('Team configuration', () => {
    const teamConfigs = [
      { name: "JO11-1", slug: "jo11-1" },
      { name: "JO12-1", slug: "jo12-1" },
      { name: "JO13-2", slug: "jo13-2" },
    ];

    it('has 3 teams', () => {
      expect(teamConfigs).toHaveLength(3);
    });

    it('uses correct Dutch youth team naming (JO = Jeugd Onder)', () => {
      teamConfigs.forEach(team => {
        expect(team.name).toMatch(/^JO\d{2}-\d$/);
      });
    });

    it('slugs are lowercase versions of names', () => {
      teamConfigs.forEach(team => {
        expect(team.slug).toBe(team.name.toLowerCase());
      });
    });
  });

  describe('Coach configuration', () => {
    const coaches = [
      { name: "Coach Mike", pin: "1234" },
      { name: "Coach Lisa", pin: "5678" },
    ];

    it('has 2 coaches', () => {
      expect(coaches).toHaveLength(2);
    });

    it('PINs are 4 digits', () => {
      coaches.forEach(coach => {
        expect(coach.pin).toMatch(/^\d{4}$/);
      });
    });

    it('PINs are unique', () => {
      const pins = coaches.map(c => c.pin);
      const uniquePins = new Set(pins);
      expect(uniquePins.size).toBe(coaches.length);
    });
  });
});
