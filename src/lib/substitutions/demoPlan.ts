import type { PortableSubstitutionPlan } from "./validatePortableSubstitutionPlan";

export type DemoPlan = Omit<PortableSubstitutionPlan, "formation"> & {
  formation: { id?: string; name?: string; slots: Array<{ id: number; position: string; x: number; y: number }> };
};

// Manually transcribed example; names and shirt numbers checked against JO13-2 on 2026-09-27.
// Database IDs and the source photo are deliberately not bundled in the public demo.
export const DEMO_PLAN: DemoPlan = {
  "format": "dia-substitution-plan",
  "version": 1,
  "match": {
    "regulationDurationMinutes": 60,
    "fieldPlayerCountIncludingKeeper": 11,
    "halftimeAtMinute": 30
  },
  "formation": {
    "slots": [
      {
        "id": 0,
        "x": 50,
        "y": 87,
        "position": "GK"
      },
      {
        "id": 1,
        "x": 14,
        "y": 68,
        "position": "LB"
      },
      {
        "id": 2,
        "x": 38,
        "y": 68,
        "position": "LCB"
      },
      {
        "id": 3,
        "x": 62,
        "y": 68,
        "position": "RCB"
      },
      {
        "id": 4,
        "x": 86,
        "y": 68,
        "position": "RB"
      },
      {
        "id": 5,
        "x": 20,
        "y": 43,
        "position": "LM"
      },
      {
        "id": 6,
        "x": 50,
        "y": 43,
        "position": "CM"
      },
      {
        "id": 7,
        "x": 80,
        "y": 43,
        "position": "RM"
      },
      {
        "id": 8,
        "x": 20,
        "y": 18,
        "position": "LW"
      },
      {
        "id": 9,
        "x": 50,
        "y": 18,
        "position": "ST"
      },
      {
        "id": 10,
        "x": 80,
        "y": 18,
        "position": "RW"
      }
    ]
  },
  "startingLineup": {
    "keeperKey": "luc",
    "field": [
      {
        "playerKey": "luc",
        "slotId": 0
      },
      {
        "playerKey": "jody",
        "slotId": 1
      },
      {
        "playerKey": "max",
        "slotId": 2
      },
      {
        "playerKey": "matteo",
        "slotId": 3
      },
      {
        "playerKey": "olivier",
        "slotId": 4
      },
      {
        "playerKey": "loek",
        "slotId": 5
      },
      {
        "playerKey": "sem",
        "slotId": 6
      },
      {
        "playerKey": "milad",
        "slotId": 7
      },
      {
        "playerKey": "tygo",
        "slotId": 8
      },
      {
        "playerKey": "lucas",
        "slotId": 9
      },
      {
        "playerKey": "revi",
        "slotId": 10
      }
    ],
    "bench": [
      "maceo",
      "krijn",
      "lukas"
    ]
  },
  "steps": [
    {
      "id": "m10",
      "matchMinute": 10,
      "actions": [
        {
          "id": "m10-a",
          "kind": "substitution",
          "playerOutKey": "revi",
          "playerInKey": "maceo"
        },
        {
          "id": "m10-b",
          "kind": "substitution",
          "playerOutKey": "sem",
          "playerInKey": "krijn"
        }
      ],
      "sourceBench": [
        "revi",
        "sem",
        "lukas"
      ]
    },
    {
      "id": "m20",
      "matchMinute": 20,
      "actions": [
        {
          "id": "m20-a",
          "kind": "substitution",
          "playerOutKey": "loek",
          "playerInKey": "sem"
        },
        {
          "id": "m20-b",
          "kind": "substitution",
          "playerOutKey": "milad",
          "playerInKey": "revi"
        },
        {
          "id": "m20-c",
          "kind": "substitution",
          "playerOutKey": "lucas",
          "playerInKey": "lukas"
        }
      ],
      "sourceBench": [
        "loek",
        "milad",
        "lucas"
      ]
    },
    {
      "id": "m30",
      "matchMinute": 30,
      "actions": [
        {
          "id": "m30-a",
          "kind": "substitution",
          "playerOutKey": "max",
          "playerInKey": "loek"
        },
        {
          "id": "m30-b",
          "kind": "substitution",
          "playerOutKey": "jody",
          "playerInKey": "milad"
        }
      ],
      "sourceBench": [
        "max",
        "jody",
        "lucas"
      ]
    },
    {
      "id": "m40",
      "matchMinute": 40,
      "actions": [
        {
          "id": "m40-a",
          "kind": "substitution",
          "playerOutKey": "matteo",
          "playerInKey": "lucas"
        },
        {
          "id": "m40-b",
          "kind": "substitution",
          "playerOutKey": "olivier",
          "playerInKey": "jody"
        }
      ],
      "sourceBench": [
        "matteo",
        "olivier",
        "max"
      ]
    },
    {
      "id": "m50",
      "matchMinute": 50,
      "actions": [
        {
          "id": "m50-a",
          "kind": "substitution",
          "playerOutKey": "tygo",
          "playerInKey": "max"
        },
        {
          "id": "m50-b",
          "kind": "substitution",
          "playerOutKey": "krijn",
          "playerInKey": "olivier"
        },
        {
          "id": "m50-c",
          "kind": "substitution",
          "playerOutKey": "lukas",
          "playerInKey": "matteo"
        },
        {
          "id": "m50-d",
          "kind": "positionSwap",
          "playerOutKey": "sem",
          "playerInKey": "olivier"
        }
      ],
      "sourceBench": [
        "tygo",
        "krijn",
        "lukas"
      ]
    }
  ],
  "players": [
    {
      "key": "tygo",
      "name": "Tygo",
      "number": 11,
      "sourceBenchMinutes": 10
    },
    {
      "key": "lucas",
      "name": "Lucas",
      "number": 7,
      "sourceBenchMinutes": 20
    },
    {
      "key": "revi",
      "name": "Revi",
      "number": 5,
      "sourceBenchMinutes": 10
    },
    {
      "key": "loek",
      "name": "Loek",
      "number": 17,
      "sourceBenchMinutes": 10
    },
    {
      "key": "sem",
      "name": "Sem",
      "number": 15,
      "sourceBenchMinutes": 10
    },
    {
      "key": "milad",
      "name": "Miloud",
      "number": 8,
      "sourceBenchMinutes": 10
    },
    {
      "key": "jody",
      "name": "Jody",
      "number": 2,
      "sourceBenchMinutes": 10
    },
    {
      "key": "max",
      "name": "Max",
      "number": 18,
      "sourceBenchMinutes": 20
    },
    {
      "key": "matteo",
      "name": "Matteo",
      "number": 3,
      "sourceBenchMinutes": 10
    },
    {
      "key": "olivier",
      "name": "Olivier",
      "number": 9,
      "sourceBenchMinutes": 10
    },
    {
      "key": "luc",
      "name": "Luc",
      "number": 1,
      "sourceBenchMinutes": null
    },
    {
      "key": "maceo",
      "name": "Macéo",
      "number": 16,
      "sourceBenchMinutes": 10
    },
    {
      "key": "krijn",
      "name": "Krijn",
      "number": 10,
      "sourceBenchMinutes": 20
    },
    {
      "key": "lukas",
      "name": "Lukas",
      "number": 14,
      "sourceBenchMinutes": 30
    }
  ],
  "review": {
    "sourceConfirmed": false,
    "unresolved": []
  }
};
