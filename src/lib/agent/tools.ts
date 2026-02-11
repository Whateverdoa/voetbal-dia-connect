/**
 * Claude tool definitions for the match agent.
 * These define what the AI assistant can do during a live match.
 * All descriptions are in Dutch (coach-facing).
 */

export const MATCH_AGENT_TOOLS = [
  {
    name: "get_match_state",
    description:
      "Haal de huidige wedstrijdstatus op: stand, opstelling (wie op veld/bank), laatste acties, kwart.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_goal",
    description:
      "Registreer een doelpunt. Geef de naam van de scorer. Optioneel: assist-gever.",
    input_schema: {
      type: "object" as const,
      properties: {
        scorerName: {
          type: "string",
          description: "Naam van de doelpuntenmaker (bijv. 'Jens')",
        },
        assistName: {
          type: "string",
          description: "Naam van de aangever (optioneel)",
        },
        isOwnGoal: { type: "boolean", description: "Eigen doelpunt" },
      },
      required: ["scorerName"],
    },
  },
  {
    name: "add_opponent_goal",
    description: "Registreer een tegendoelpunt.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "make_substitution",
    description:
      "Wissel spelers: één eruit (moet op veld staan), één erin (moet op bank zitten).",
    input_schema: {
      type: "object" as const,
      properties: {
        playerOutName: {
          type: "string",
          description: "Naam van speler die eruit gaat",
        },
        playerInName: {
          type: "string",
          description: "Naam van speler die erin komt",
        },
      },
      required: ["playerOutName", "playerInName"],
    },
  },
  {
    name: "undo_last",
    description:
      "Maak de laatste actie ongedaan (doelpunt, wissel, of kaart).",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "correct_score",
    description: "Pas de stand direct aan.",
    input_schema: {
      type: "object" as const,
      properties: {
        homeScore: { type: "number", description: "Thuisscore" },
        awayScore: { type: "number", description: "Uitscore" },
      },
      required: ["homeScore", "awayScore"],
    },
  },
  {
    name: "next_quarter",
    description: "Ga naar het volgende kwart of beëindig de wedstrijd.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "pause_match",
    description:
      "Pauzeer de wedstrijd met een reden (blessure, weer, overleg).",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: {
          type: "string",
          enum: ["injury", "weather", "discussion", "technical", "other"],
          description: "Reden voor pauze",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "resume_match",
    description: "Hervat de wedstrijd na een pauze.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_playing_time",
    description:
      "Bekijk speeltijd per speler. Toont wie het minst heeft gespeeld.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "suggest_substitutions",
    description:
      "Stel wissels voor op basis van eerlijke speeltijd. Geeft aan wie het langst op de bank zit.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
] as const;

export type ToolName = (typeof MATCH_AGENT_TOOLS)[number]["name"];
