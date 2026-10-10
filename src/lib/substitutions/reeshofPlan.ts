import type { DemoPlan } from "./demoPlan";

// Read-only coach snapshot. Local keys and first names only; no database IDs.
// Slot IDs and sides match the app; coordinates fit the half pitch.
// Luc occupies the explicit GK slot; the missing source keeper flag is a review note.
// Group by absolute targetMinute, retaining sequence within each moment.
export const REESHOF_IMPORTED_PLAN: DemoPlan = {
  "format": "dia-substitution-plan",
  "version": 1,
  "match": {
    "regulationDurationMinutes": 60,
    "fieldPlayerCountIncludingKeeper": 11,
    "halftimeAtMinute": 30
  },
  "formation": {
    "id": "app-reeshof-4-3-3",
    "name": "4-3-3 (opstelling coach)",
    "slots": [
      {
        "id": 0,
        "position": "GK",
        "x": 50,
        "y": 87
      },
      {
        "id": 1,
        "position": "RB",
        "x": 86,
        "y": 68
      },
      {
        "id": 2,
        "position": "CB",
        "x": 62,
        "y": 68
      },
      {
        "id": 3,
        "position": "CB",
        "x": 38,
        "y": 68
      },
      {
        "id": 4,
        "position": "LB",
        "x": 14,
        "y": 68
      },
      {
        "id": 5,
        "position": "CDM",
        "x": 50,
        "y": 51
      },
      {
        "id": 6,
        "position": "CM",
        "x": 75,
        "y": 39
      },
      {
        "id": 7,
        "position": "CM",
        "x": 25,
        "y": 39
      },
      {
        "id": 8,
        "position": "RW",
        "x": 83,
        "y": 16
      },
      {
        "id": 9,
        "position": "ST",
        "x": 50,
        "y": 16
      },
      {
        "id": 10,
        "position": "LW",
        "x": 17,
        "y": 16
      }
    ]
  },
  "players": [
    {
      "key": "reeshof-p01",
      "name": "Jody",
      "number": 2,
      "absent": false
    },
    {
      "key": "reeshof-p02",
      "name": "Loek",
      "number": 17,
      "absent": false
    },
    {
      "key": "reeshof-p03",
      "name": "Luc",
      "number": 1,
      "absent": false
    },
    {
      "key": "reeshof-p04",
      "name": "Revi",
      "number": 5,
      "absent": false
    },
    {
      "key": "reeshof-p05",
      "name": "Lukas",
      "number": 14,
      "absent": false
    },
    {
      "key": "reeshof-p06",
      "name": "Miloud",
      "number": 8,
      "absent": false
    },
    {
      "key": "reeshof-p07",
      "name": "Luuk",
      "number": 4,
      "absent": false
    },
    {
      "key": "reeshof-p08",
      "name": "Sem",
      "number": 15,
      "absent": false
    },
    {
      "key": "reeshof-p09",
      "name": "Tygo",
      "number": 11,
      "absent": false
    },
    {
      "key": "reeshof-p10",
      "name": "Olivier",
      "number": 9,
      "absent": false
    },
    {
      "key": "reeshof-p11",
      "name": "Krijn",
      "number": 10,
      "absent": false
    },
    {
      "key": "reeshof-p12",
      "name": "Lucas",
      "number": 7,
      "absent": false
    },
    {
      "key": "reeshof-p13",
      "name": "Maceo",
      "number": 16,
      "absent": false
    },
    {
      "key": "reeshof-p14",
      "name": "Max",
      "number": 18,
      "absent": false
    },
    {
      "key": "reeshof-p15",
      "name": "Matteo",
      "number": 3,
      "absent": false
    }
  ],
  "startingLineup": {
    "keeperKey": "reeshof-p03",
    "field": [
      {
        "playerKey": "reeshof-p03",
        "slotId": 0
      },
      {
        "playerKey": "reeshof-p13",
        "slotId": 1
      },
      {
        "playerKey": "reeshof-p10",
        "slotId": 2
      },
      {
        "playerKey": "reeshof-p14",
        "slotId": 3
      },
      {
        "playerKey": "reeshof-p01",
        "slotId": 4
      },
      {
        "playerKey": "reeshof-p08",
        "slotId": 5
      },
      {
        "playerKey": "reeshof-p02",
        "slotId": 6
      },
      {
        "playerKey": "reeshof-p11",
        "slotId": 7
      },
      {
        "playerKey": "reeshof-p06",
        "slotId": 8
      },
      {
        "playerKey": "reeshof-p05",
        "slotId": 9
      },
      {
        "playerKey": "reeshof-p09",
        "slotId": 10
      }
    ],
    "bench": [
      "reeshof-p04",
      "reeshof-p07",
      "reeshof-p12",
      "reeshof-p15"
    ]
  },
  "steps": [
    {
      "id": "reeshof-m10",
      "matchMinute": 10,
      "actions": [
        {
          "id": "reeshof-action-0",
          "kind": "substitution",
          "playerOutKey": "reeshof-p09",
          "playerInKey": "reeshof-p12"
        },
        {
          "id": "reeshof-action-1",
          "kind": "substitution",
          "playerOutKey": "reeshof-p10",
          "playerInKey": "reeshof-p04"
        },
        {
          "id": "reeshof-action-2",
          "kind": "positionSwap",
          "playerOutKey": "reeshof-p11",
          "playerInKey": "reeshof-p04"
        }
      ]
    },
    {
      "id": "reeshof-m20",
      "matchMinute": 20,
      "actions": [
        {
          "id": "reeshof-action-3",
          "kind": "substitution",
          "playerOutKey": "reeshof-p01",
          "playerInKey": "reeshof-p15"
        },
        {
          "id": "reeshof-action-4",
          "kind": "substitution",
          "playerOutKey": "reeshof-p05",
          "playerInKey": "reeshof-p09"
        },
        {
          "id": "reeshof-action-5",
          "kind": "positionSwap",
          "playerOutKey": "reeshof-p09",
          "playerInKey": "reeshof-p12"
        }
      ]
    },
    {
      "id": "reeshof-m30",
      "matchMinute": 30,
      "actions": [
        {
          "id": "reeshof-action-6",
          "kind": "substitution",
          "playerOutKey": "reeshof-p14",
          "playerInKey": "reeshof-p10"
        },
        {
          "id": "reeshof-action-7",
          "kind": "substitution",
          "playerOutKey": "reeshof-p08",
          "playerInKey": "reeshof-p05"
        }
      ]
    },
    {
      "id": "reeshof-m40",
      "matchMinute": 40,
      "actions": [
        {
          "id": "reeshof-action-8",
          "kind": "substitution",
          "playerOutKey": "reeshof-p13",
          "playerInKey": "reeshof-p01"
        },
        {
          "id": "reeshof-action-9",
          "kind": "substitution",
          "playerOutKey": "reeshof-p06",
          "playerInKey": "reeshof-p08"
        },
        {
          "id": "reeshof-action-10",
          "kind": "positionSwap",
          "playerOutKey": "reeshof-p08",
          "playerInKey": "reeshof-p04"
        },
        {
          "id": "reeshof-action-11",
          "kind": "positionSwap",
          "playerOutKey": "reeshof-p05",
          "playerInKey": "reeshof-p12"
        },
        {
          "id": "reeshof-action-12",
          "kind": "positionSwap",
          "playerOutKey": "reeshof-p08",
          "playerInKey": "reeshof-p12"
        },
        {
          "id": "reeshof-action-14",
          "kind": "positionSwap",
          "playerOutKey": "reeshof-p10",
          "playerInKey": "reeshof-p01"
        }
      ]
    },
    {
      "id": "reeshof-m50",
      "matchMinute": 50,
      "actions": [
        {
          "id": "reeshof-action-13",
          "kind": "substitution",
          "playerOutKey": "reeshof-p02",
          "playerInKey": "reeshof-p14"
        }
      ]
    }
  ],
  "review": {
    "sourceConfirmed": false,
    "unresolved": []
  }
};

// Match-specific availability confirmed by the user on 2026-10-09.
// Preserve the raw app selection; do not carry absence settings from another match.
export const REESHOF_PLAN: DemoPlan = {
  ...REESHOF_IMPORTED_PLAN,
  players: REESHOF_IMPORTED_PLAN.players.map((player) => player.key === "reeshof-p07"
    ? { ...player, absent: true }
    : { ...player }),
  startingLineup: {
    ...REESHOF_IMPORTED_PLAN.startingLineup,
    bench: REESHOF_IMPORTED_PLAN.startingLineup.bench.filter((key) => key !== "reeshof-p07"),
  },
  review: { ...REESHOF_IMPORTED_PLAN.review, sourceConfirmed: false },
};

export const REESHOF_SOURCE_DETAILS = {
  "id": "reeshof-2026-10-10",
  "kind": "app",
  "teamName": "DIA JO13-2",
  "matchLabel": "SV Reeshof O13-1 – DIA JO13-2 · 10 oktober 2026, 09:30",
  "capturedAt": "2026-10-09T18:55:56.291Z",
  "sourceUrl": "https://voetbal-dia-connect.vercel.app/live/SZNCWD",
  "notes": [
    "Coachopstelling 4-3-3 overgenomen: 9 bankwissels en 6 positieruilen op 5 momenten. Uitwedstrijd op zaterdag 10 oktober om 09:30.",
    "Voor deze wedstrijd bevestigd: Krijn 10 is beschikbaar, Luuk 4 niet. Luuk is alleen in deze lokale kopie uitgesloten; de app is niet gewijzigd.",
    "Keeper controleren: Luc 1 staat in de app op keeperpositie 0, maar de keepermarkering ontbreekt. Deze kopie gebruikt zijn plek op het veld als keepertoewijzing.",
    "De positieruil Olivier 9 ↔ Jody 2 staat onderaan de bronlijst, na minuut 50, maar is gepland voor minuut 40. Hier staat hij bij minuut 40, na de overige acties op dat moment.",
    "De app staat op 4 × 15 minuten. De totale duur is niet apart ingevuld; volgens de app geldt dan 60 minuten. Deze oefenklok pauzeert alleen bij 30 minuten; alle wisselminuten tellen vanaf de aftrap."
  ]
} as const;
