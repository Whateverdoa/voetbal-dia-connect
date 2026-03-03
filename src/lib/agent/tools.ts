type ToolProperty = {
  type: "string" | "number" | "boolean";
  description: string;
};

type ToolSchema = {
  type: "object";
  properties: Record<string, ToolProperty>;
  required: string[];
  additionalProperties: boolean;
};

export interface MatchAgentTool {
  name: string;
  description: string;
  input_schema: ToolSchema;
}

const emptySchema: ToolSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
};

export const MATCH_AGENT_TOOLS = [
  {
    name: "stage_substitution",
    description:
      "Plan een wissel zonder lineup direct te wijzigen. Gebruik speler eruit en speler erin.",
    input_schema: {
      type: "object",
      properties: {
        playerOutName: {
          type: "string",
          description: "Naam van de speler die eruit gaat",
        },
        playerInName: {
          type: "string",
          description: "Naam van de speler die erin komt",
        },
      },
      required: ["playerOutName", "playerInName"],
      additionalProperties: false,
    },
  },
  {
    name: "confirm_substitution",
    description:
      "Bevestig een staged wissel. Alleen bij geldige actuele precondities wordt de wissel uitgevoerd.",
    input_schema: {
      type: "object",
      properties: {
        stagedEventId: {
          type: "string",
          description: "Event id van de staged wissel",
        },
      },
      required: ["stagedEventId"],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_staged_substitution",
    description: "Annuleer een open staged wissel.",
    input_schema: {
      type: "object",
      properties: {
        stagedEventId: {
          type: "string",
          description: "Event id van de staged wissel",
        },
      },
      required: ["stagedEventId"],
      additionalProperties: false,
    },
  },
  {
    name: "enrich_goal",
    description:
      "Verrijk een bestaand doelpunt-event met scorer- en assistinformatie.",
    input_schema: {
      type: "object",
      properties: {
        targetEventId: {
          type: "string",
          description: "Event id van het doelpunt dat verrijkt moet worden",
        },
        scorerName: {
          type: "string",
          description: "Naam van de scorer (optioneel)",
        },
        assistName: {
          type: "string",
          description: "Naam van de assist-gever (optioneel)",
        },
      },
      required: ["targetEventId"],
      additionalProperties: false,
    },
  },
] as const satisfies readonly MatchAgentTool[];

export const MATCH_AGENT_COMMAND_MAP = {
  stage_substitution: "STAGE_SUBSTITUTION",
  confirm_substitution: "CONFIRM_SUBSTITUTION",
  cancel_staged_substitution: "CANCEL_STAGED_SUBSTITUTION",
  enrich_goal: "ENRICH_GOAL",
} as const;

export type MatchAgentToolName = keyof typeof MATCH_AGENT_COMMAND_MAP;

export const DEFAULT_MATCH_AGENT_TOOL_SCHEMA = emptySchema;
