"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  PresentTacticsBoard,
  type KleedkamerMatch,
} from "@/components/presentation/PresentTacticsBoard";
import { TeamDeckGrid } from "@/components/cards/TeamDeckGrid";
import { TacticPitch } from "@/components/tactics/TacticPitch";
import { canPresentTactics } from "@/lib/auth/roles";

export type StudioTab = "tactiek" | "kleedkamer" | "kaarten";

export type StudioMatch = KleedkamerMatch & {
  isSelectionTeam: boolean;
};

type DeckPlayer = Parameters<typeof TeamDeckGrid>[0]["players"][number];

interface PresentStudioProps {
  match: StudioMatch;
  deck: DeckPlayer[] | undefined;
  kiosk?: boolean;
  initialTab?: StudioTab;
}

export function parseStudioTab(
  value: string | null,
  fallback: StudioTab
): StudioTab {
  if (value === "tactiek" || value === "kleedkamer" || value === "kaarten") {
    return value;
  }
  return fallback;
}

export function PresentStudio({
  match,
  deck,
  kiosk = false,
  initialTab = "tactiek",
}: PresentStudioProps) {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const access = useQuery(api.userQueries.getMyRoles);
  const canEdit = canPresentTactics(access?.roles ?? []) && !kiosk;
  const q = kiosk ? "?kiosk=1" : "";

  const pitchTab = tab === "tactiek" || tab === "kleedkamer";

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex flex-wrap gap-2 mb-4">
        <TabButton active={tab === "tactiek"} onClick={() => setTab("tactiek")}>
          Tactiek
        </TabButton>
        <TabButton
          active={tab === "kleedkamer"}
          onClick={() => setTab("kleedkamer")}
        >
          Kleedkamer
        </TabButton>
        <TabButton active={tab === "kaarten"} onClick={() => setTab("kaarten")}>
          Spelerskaarten
        </TabButton>
        <Link
          href={`/present/match/${match.publicCode}${q}`}
          className="ml-auto px-4 py-2 rounded-lg bg-dia-black text-dia-yellow ring-2 ring-dia-yellow font-semibold min-h-[48px] flex items-center"
        >
          Kantine live →
        </Link>
      </div>

      <div
        className={
          pitchTab
            ? "flex-1 min-h-0 overflow-hidden"
            : "flex-1 min-h-0 overflow-auto"
        }
      >
        {tab === "tactiek" ? (
          <TacticPitch
            matchId={match.matchId}
            formationId={match.formationId}
            players={match.players}
            canEdit={canEdit}
          />
        ) : null}

        {tab === "kleedkamer" ? (
          <PresentTacticsBoard match={match} kiosk={kiosk} />
        ) : null}

        {tab === "kaarten" ? (
          match.isSelectionTeam ? (
            <TeamDeckGrid players={deck ?? []} />
          ) : (
            <p className="text-slate-400 text-center py-16">
              Spelerskaarten zijn er alleen voor selectieteams.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold min-h-[48px] ${
        active
          ? "bg-dia-black text-dia-yellow ring-2 ring-dia-yellow"
          : "bg-dia-yellow text-black"
      }`}
    >
      {children}
    </button>
  );
}
