import type { DemoPlan } from "./demoPlan";

// Read-only snapshot of the coach plan, captured through an indexed Convex query.
// Player keys are local to this snapshot; database IDs and surnames are not bundled.
// App slot IDs/roles and left/right placement are preserved; coordinates fit the half pitch.
// targetMinute is an absolute match minute. Never add a targetQuarter offset.
export const GILZE_IMPORTED_PLAN: DemoPlan = {
  "format": "dia-substitution-plan",
  "version": 1,
  "match": {
    "regulationDurationMinutes": 60,
    "fieldPlayerCountIncludingKeeper": 11,
    "halftimeAtMinute": 30
  },
  "formation": {
    "id": "app-gilze-3-5-2",
    "name": "3-5-2 (opstelling coach)",
    "slots": [
      {
        "id": 0,
        "position": "GK",
        "x": 50,
        "y": 87
      },
      {
        "id": 1,
        "position": "CB",
        "x": 80,
        "y": 68
      },
      {
        "id": 2,
        "position": "CB",
        "x": 50,
        "y": 68
      },
      {
        "id": 3,
        "position": "CB",
        "x": 20,
        "y": 68
      },
      {
        "id": 4,
        "position": "RWB",
        "x": 88,
        "y": 43
      },
      {
        "id": 5,
        "position": "CM",
        "x": 69,
        "y": 43
      },
      {
        "id": 6,
        "position": "CAM",
        "x": 50,
        "y": 32
      },
      {
        "id": 7,
        "position": "CM",
        "x": 31,
        "y": 43
      },
      {
        "id": 8,
        "position": "LWB",
        "x": 12,
        "y": 43
      },
      {
        "id": 9,
        "position": "ST",
        "x": 65,
        "y": 16
      },
      {
        "id": 10,
        "position": "ST",
        "x": 35,
        "y": 16
      }
    ]
  },
  "players": [
    {
      "key": "gilze-p01",
      "name": "Jody",
      "number": 2,
      "absent": false
    },
    {
      "key": "gilze-p02",
      "name": "Loek",
      "number": 17,
      "absent": false
    },
    {
      "key": "gilze-p03",
      "name": "Luc",
      "number": 1,
      "absent": false
    },
    {
      "key": "gilze-p04",
      "name": "Revi",
      "number": 5,
      "absent": false
    },
    {
      "key": "gilze-p05",
      "name": "Lukas",
      "number": 14,
      "absent": false
    },
    {
      "key": "gilze-p06",
      "name": "Miloud",
      "number": 8,
      "absent": false
    },
    {
      "key": "gilze-p07",
      "name": "Luuk",
      "number": 4,
      "absent": false
    },
    {
      "key": "gilze-p08",
      "name": "Sem",
      "number": 15,
      "absent": false
    },
    {
      "key": "gilze-p09",
      "name": "Tygo",
      "number": 11,
      "absent": false
    },
    {
      "key": "gilze-p10",
      "name": "Olivier",
      "number": 9,
      "absent": false
    },
    {
      "key": "gilze-p11",
      "name": "Krijn",
      "number": 10,
      "absent": false
    },
    {
      "key": "gilze-p12",
      "name": "Lucas",
      "number": 7,
      "absent": false
    },
    {
      "key": "gilze-p13",
      "name": "Maceo",
      "number": 16,
      "absent": false
    },
    {
      "key": "gilze-p14",
      "name": "Max",
      "number": 18,
      "absent": false
    },
    {
      "key": "gilze-p15",
      "name": "Matteo",
      "number": 3,
      "absent": false
    }
  ],
  "startingLineup": {
    "keeperKey": "gilze-p03",
    "field": [
      {
        "playerKey": "gilze-p03",
        "slotId": 0
      },
      {
        "playerKey": "gilze-p10",
        "slotId": 1
      },
      {
        "playerKey": "gilze-p11",
        "slotId": 2
      },
      {
        "playerKey": "gilze-p01",
        "slotId": 3
      },
      {
        "playerKey": "gilze-p13",
        "slotId": 4
      },
      {
        "playerKey": "gilze-p14",
        "slotId": 5
      },
      {
        "playerKey": "gilze-p02",
        "slotId": 6
      },
      {
        "playerKey": "gilze-p08",
        "slotId": 7
      },
      {
        "playerKey": "gilze-p09",
        "slotId": 8
      },
      {
        "playerKey": "gilze-p06",
        "slotId": 9
      },
      {
        "playerKey": "gilze-p05",
        "slotId": 10
      }
    ],
    "bench": [
      "gilze-p04",
      "gilze-p07",
      "gilze-p12",
      "gilze-p15"
    ]
  },
  "steps": [
    {
      "id": "gilze-m10",
      "matchMinute": 10,
      "actions": [
        {
          "id": "gilze-action-0",
          "kind": "substitution",
          "playerOutKey": "gilze-p10",
          "playerInKey": "gilze-p15"
        },
        {
          "id": "gilze-action-1",
          "kind": "positionSwap",
          "playerOutKey": "gilze-p15",
          "playerInKey": "gilze-p11"
        },
        {
          "id": "gilze-action-2",
          "kind": "substitution",
          "playerOutKey": "gilze-p02",
          "playerInKey": "gilze-p12"
        }
      ]
    },
    {
      "id": "gilze-m20",
      "matchMinute": 20,
      "actions": [
        {
          "id": "gilze-action-3",
          "kind": "substitution",
          "playerOutKey": "gilze-p08",
          "playerInKey": "gilze-p04"
        },
        {
          "id": "gilze-action-4",
          "kind": "substitution",
          "playerOutKey": "gilze-p05",
          "playerInKey": "gilze-p10"
        },
        {
          "id": "gilze-action-5",
          "kind": "positionSwap",
          "playerOutKey": "gilze-p13",
          "playerInKey": "gilze-p11"
        },
        {
          "id": "gilze-action-6",
          "kind": "positionSwap",
          "playerOutKey": "gilze-p13",
          "playerInKey": "gilze-p10"
        }
      ]
    },
    {
      "id": "gilze-m30",
      "matchMinute": 30,
      "actions": [
        {
          "id": "gilze-action-7",
          "kind": "substitution",
          "playerOutKey": "gilze-p14",
          "playerInKey": "gilze-p02"
        },
        {
          "id": "gilze-action-8",
          "kind": "substitution",
          "playerOutKey": "gilze-p09",
          "playerInKey": "gilze-p08"
        }
      ]
    },
    {
      "id": "gilze-m40",
      "matchMinute": 40,
      "actions": [
        {
          "id": "gilze-action-9",
          "kind": "substitution",
          "playerOutKey": "gilze-p06",
          "playerInKey": "gilze-p05"
        },
        {
          "id": "gilze-action-10",
          "kind": "substitution",
          "playerOutKey": "gilze-p11",
          "playerInKey": "gilze-p14"
        },
        {
          "id": "gilze-action-11",
          "kind": "positionSwap",
          "playerOutKey": "gilze-p04",
          "playerInKey": "gilze-p14"
        }
      ]
    },
    {
      "id": "gilze-m50",
      "matchMinute": 50,
      "actions": [
        {
          "id": "gilze-action-12",
          "kind": "substitution",
          "playerOutKey": "gilze-p13",
          "playerInKey": "gilze-p09"
        },
        {
          "id": "gilze-action-13",
          "kind": "substitution",
          "playerOutKey": "gilze-p01",
          "playerInKey": "gilze-p11"
        }
      ]
    }
  ],
  "review": {
    "sourceConfirmed": false,
    "unresolved": []
  }
};

// User-confirmed local correction on 2026-10-02; the read-only app snapshot stays intact.
export const GILZE_PLAN: DemoPlan = {
  ...GILZE_IMPORTED_PLAN,
  players: GILZE_IMPORTED_PLAN.players.map((player) => player.key === "gilze-p07"
    ? { ...player, absent: true, unavailableReason: "injured" }
    : { ...player }),
  startingLineup: {
    ...GILZE_IMPORTED_PLAN.startingLineup,
    bench: GILZE_IMPORTED_PLAN.startingLineup.bench.filter((key) => key !== "gilze-p07"),
  },
  review: { ...GILZE_IMPORTED_PLAN.review, sourceConfirmed: false },
};

export const GILZE_SOURCE_DETAILS = {
  "id": "gilze-2026-10-03",
  "kind": "app",
  "teamName": "DIA JO13-2",
  "matchLabel": "DIA JO13-2 – Gilze O13-1 · 3 oktober 2026",
  "capturedAt": "2026-10-02T19:41:57.029Z",
  "sourceUrl": "https://voetbal-dia-connect.vercel.app/live/ZV2K7A",
  "notes": [
    "Opstelling en 14 geplande acties van de coach overgenomen: 10 wissels en 4 positieruilen, op 5 momenten.",
    "Lokaal aangevuld op 2 oktober: Luuk 4 is geblesseerd en niet beschikbaar. Hij telt niet mee als bankspeler of in de minutenverdeling. De app is niet gewijzigd.",
    "De app staat ingesteld op 4 × 15 minuten. Deze oefenklok pauzeert alleen bij 30 minuten; wisselminuten zijn totale wedstrijdminuten."
  ]
} as const;
