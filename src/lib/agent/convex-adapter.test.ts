/**
 * Tests for the Convex adapter's fuzzy player name matching.
 * The adapter itself requires a real Convex connection, so we test
 * the findPlayer utility by extracting its logic.
 */
import { describe, it, expect } from "vitest";

/* ── Reproduce findPlayer logic for unit testing ── */

interface TestPlayer {
  playerId: string;
  name: string;
  number?: number;
  onField: boolean;
  isKeeper: boolean;
  minutesPlayed?: number;
}

function findPlayer(
  players: TestPlayer[],
  name: string,
  mustBeOnField?: boolean,
): TestPlayer | undefined {
  const lower = name.toLowerCase().trim();
  if (!lower) return undefined;

  const filtered =
    mustBeOnField === true
      ? players.filter((p) => p.onField)
      : mustBeOnField === false
        ? players.filter((p) => !p.onField)
        : players;

  // Exact match first
  const exact = filtered.find((p) => p.name.toLowerCase() === lower);
  if (exact) return exact;

  // Partial / contains match
  return filtered.find((p) => {
    const pLower = p.name.toLowerCase();
    return pLower.includes(lower) || lower.includes(pLower.split(" ")[0]);
  });
}

/* ── Test data ── */

const PLAYERS: TestPlayer[] = [
  { playerId: "p1", name: "Tim Jansen", onField: true, isKeeper: false },
  { playerId: "p2", name: "Kees de Vries", onField: true, isKeeper: false },
  { playerId: "p3", name: "Jens van Dijk", onField: true, isKeeper: false },
  { playerId: "p4", name: "Liam Bakker", onField: false, isKeeper: false },
  { playerId: "p5", name: "Noah Visser", onField: false, isKeeper: false },
  { playerId: "p6", name: "Sem Peters", onField: true, isKeeper: true },
];

describe("findPlayer — fuzzy name matching", () => {
  describe("exact match", () => {
    it("finds player by exact full name", () => {
      expect(findPlayer(PLAYERS, "Tim Jansen")?.playerId).toBe("p1");
    });

    it("is case-insensitive", () => {
      expect(findPlayer(PLAYERS, "tim jansen")?.playerId).toBe("p1");
      expect(findPlayer(PLAYERS, "TIM JANSEN")?.playerId).toBe("p1");
    });

    it("trims whitespace", () => {
      expect(findPlayer(PLAYERS, "  Tim Jansen  ")?.playerId).toBe("p1");
    });
  });

  describe("partial match", () => {
    it("matches by last name", () => {
      expect(findPlayer(PLAYERS, "Jansen")?.playerId).toBe("p1");
    });

    it("matches by first name", () => {
      expect(findPlayer(PLAYERS, "Kees")?.playerId).toBe("p2");
    });

    it("matches partial last name", () => {
      expect(findPlayer(PLAYERS, "Dijk")?.playerId).toBe("p3");
    });

    it("matches partial input containing first name", () => {
      expect(findPlayer(PLAYERS, "liam")?.playerId).toBe("p4");
    });
  });

  describe("field filtering", () => {
    it("filters to on-field players only", () => {
      const result = findPlayer(PLAYERS, "Liam", true);
      expect(result).toBeUndefined(); // Liam is on bench
    });

    it("filters to bench players only", () => {
      const result = findPlayer(PLAYERS, "Tim", false);
      expect(result).toBeUndefined(); // Tim is on field
    });

    it("finds on-field player when mustBeOnField is true", () => {
      expect(findPlayer(PLAYERS, "Tim", true)?.playerId).toBe("p1");
    });

    it("finds bench player when mustBeOnField is false", () => {
      expect(findPlayer(PLAYERS, "Liam", false)?.playerId).toBe("p4");
    });

    it("returns undefined when no match found", () => {
      expect(findPlayer(PLAYERS, "Pietje")).toBeUndefined();
    });
  });

  describe("voice recognition edge cases", () => {
    it("handles common Dutch voice-recognition spelling", () => {
      // "de Vries" often heard as partial
      expect(findPlayer(PLAYERS, "Vries")?.playerId).toBe("p2");
    });

    it("handles first name only for unique names", () => {
      expect(findPlayer(PLAYERS, "Noah")?.playerId).toBe("p5");
      expect(findPlayer(PLAYERS, "Sem")?.playerId).toBe("p6");
    });

    it("returns undefined for empty input", () => {
      expect(findPlayer(PLAYERS, "")).toBeUndefined();
    });

    it("returns undefined for gibberish", () => {
      expect(findPlayer(PLAYERS, "xyzabc123")).toBeUndefined();
    });
  });
});

describe("listNames utility", () => {
  function listNames(players: TestPlayer[]): string {
    return players.map((p) => p.name).join(", ");
  }

  it("joins player names with comma", () => {
    expect(listNames(PLAYERS)).toBe(
      "Tim Jansen, Kees de Vries, Jens van Dijk, Liam Bakker, Noah Visser, Sem Peters",
    );
  });

  it("handles empty list", () => {
    expect(listNames([])).toBe("");
  });

  it("handles single player", () => {
    expect(listNames([PLAYERS[0]])).toBe("Tim Jansen");
  });
});

describe("MATCH_AGENT_TOOLS", () => {
  it("exports 11 tool definitions", async () => {
    const { MATCH_AGENT_TOOLS } = await import("./tools");
    expect(MATCH_AGENT_TOOLS).toHaveLength(11);
  });

  it("all tools have name, description, and input_schema", async () => {
    const { MATCH_AGENT_TOOLS } = await import("./tools");
    for (const tool of MATCH_AGENT_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe("object");
    }
  });

  it("tool names are unique", async () => {
    const { MATCH_AGENT_TOOLS } = await import("./tools");
    const names = MATCH_AGENT_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("descriptions are in Dutch", async () => {
    const { MATCH_AGENT_TOOLS } = await import("./tools");
    // Check for common Dutch words
    const dutchWords = ["doelpunt", "wissel", "kwart", "wedstrijd", "speler", "stand"];
    const allDescriptions = MATCH_AGENT_TOOLS.map((t) => t.description.toLowerCase()).join(" ");
    const foundDutch = dutchWords.filter((w) => allDescriptions.includes(w));
    expect(foundDutch.length).toBeGreaterThanOrEqual(4);
  });
});

describe("MATCH_AGENT_SYSTEM_PROMPT", () => {
  it("is in Dutch", async () => {
    const { MATCH_AGENT_SYSTEM_PROMPT } = await import("./system-prompt");
    expect(MATCH_AGENT_SYSTEM_PROMPT).toContain("wedstrijdassistent");
    expect(MATCH_AGENT_SYSTEM_PROMPT).toContain("Nederlands");
  });

  it("mentions DIA club", async () => {
    const { MATCH_AGENT_SYSTEM_PROMPT } = await import("./system-prompt");
    expect(MATCH_AGENT_SYSTEM_PROMPT).toContain("DIA");
  });

  it("includes rules section", async () => {
    const { MATCH_AGENT_SYSTEM_PROMPT } = await import("./system-prompt");
    expect(MATCH_AGENT_SYSTEM_PROMPT).toContain("## Regels:");
  });

  it("includes playing time advice", async () => {
    const { MATCH_AGENT_SYSTEM_PROMPT } = await import("./system-prompt");
    expect(MATCH_AGENT_SYSTEM_PROMPT).toContain("Speeltijd-advies");
  });
});
