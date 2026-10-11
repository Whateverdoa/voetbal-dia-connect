"use client";

import { useEffect, useRef } from "react";
import { FC_ATTRIBUTES, PLAY_STYLES, withCardBonus, type CardProfile, type FcCardData } from "@/lib/cards/fc27";
import { useCardTime } from "@/hooks/useCardTime";
import { FcPlayerShield } from "./FcPlayerShield";
import { PlayStyleIcon } from "./PlayStyleIcon";

export type DeckPlayer = FcCardData & {
  playerId: string;
  displayName: string;
  number: number | null;
  positionPrimary: string | null;
  photoUrl: string | null;
  cardProfile: CardProfile | null;
  showFullIdentity: boolean;
};

interface PlayerCardDetailModalProps {
  player: DeckPlayer;
  onClose: () => void;
  showMinutes?: boolean;
}

export function PlayerCardDetailModal({ player, onClose, showMinutes = false }: PlayerCardDetailModalProps) {
  const stats = player.cardProfile?.seasonStats;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const now = useCardTime(player.recognitions);
  const card = withCardBonus(player.fcRatings, player.recognitions, now);
  const styles = PLAY_STYLES.filter((style) => player.playStyleIds?.includes(style.id));

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
      const first = buttons?.[0];
      const last = buttons?.[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="player-card-detail-title" onClick={onClose}>
      <div ref={dialogRef} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-dia-yellow/30 bg-dia-black p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div><p className="text-xs text-dia-yellow/70">{player.positionPrimary ?? "Speler"}{player.number != null ? ` · #${player.number}` : ""}</p>
            <h2 id="player-card-detail-title" className="text-xl font-bold">{player.displayName}</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-white/10 text-xl" aria-label="Sluiten detail">×</button>
        </div>
        <FcPlayerShield name={player.displayName} number={player.number} position={player.positionPrimary} photoUrl={player.photoUrl}
          fcRatings={player.fcRatings} recognitions={player.recognitions} playStyleIds={player.playStyleIds} width={220} className="mx-auto mb-4" />
        <h3 className="mb-2 text-sm font-bold text-dia-yellow">Kenmerken</h3>
        {card.ratings ? <>
          <p className="mb-3 text-xs text-white/60">{card.overall === null ? "Nog niet alle zes kenmerken zijn beoordeeld. De totaalscore volgt zodra de beoordeling compleet is." : `Algemeen ${card.overall}: het afgeronde gemiddelde van de zes scores.`}{card.bonus ? ` Inclusief +${card.bonus} voor het team van de ${card.kind === "month" ? "maand" : "week"}.` : ""}</p>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{FC_ATTRIBUTES.map((attribute) => <div key={attribute.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <dt className="flex items-center gap-2 text-xs text-white/70"><PlayStyleIcon styleId={attribute.icon} size={23} decorative />{attribute.name}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-dia-yellow">{card.ratings?.[attribute.key] ?? "—"}</dd>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">{attribute.help}</p>
          </div>)}</dl>
        </> : <p className="text-sm text-white/50">Nog geen beoordeling beschikbaar.</p>}
        <h3 className="mb-2 mt-5 text-sm font-bold text-dia-yellow">Speelstijlen</h3>
        {styles.length ? <ul className="space-y-2">{styles.map((style) => <li key={style.id} className="flex gap-3 rounded-xl border border-white/10 p-3">
          <PlayStyleIcon styleId={style.id} size={36} decorative className="text-emerald-300" /><div><p className="text-sm font-semibold">{style.name}</p><p className="text-xs text-white/50">{style.category} · {style.description}</p></div>
        </li>)}</ul> : <p className="text-sm text-white/50">Nog geen speelstijlen toegekend.</p>}
        {player.cardProfile ? <div className="mt-5 space-y-3">
          <div className="flex justify-between text-sm text-dia-yellow"><span>Level {player.cardProfile.level}</span><span>{player.cardProfile.xp} XP</span></div>
          {stats ? <dl className="grid grid-cols-2 gap-2">
            <Stat label="Wedstrijden" value={stats.matches} />
            {showMinutes && stats.minutes !== undefined ? <Stat label="Minuten" value={stats.minutes} /> : null}
            <Stat label="Doelpunten" value={stats.goals} /><Stat label="Assists" value={stats.assists} /><Stat label="Clean sheets" value={stats.cleanSheets} />
          </dl> : null}
          {player.cardProfile.badges?.length ? <div className="flex flex-wrap gap-1.5">{player.cardProfile.badges.map((badge) => <span key={badge} className="rounded border border-dia-yellow/30 bg-dia-yellow/10 px-2 py-1 text-xs text-dia-yellow">{badge.replace(/_/g, " ")}</span>)}</div> : null}
        </div> : <p className="mt-5 text-sm text-white/50">Geen seizoensstatistieken beschikbaar.</p>}
        <button type="button" onClick={onClose} className="mt-5 min-h-[48px] w-full rounded-xl bg-dia-yellow font-semibold text-black">Sluiten</button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><dt className="text-xs text-white/50">{label}</dt><dd className="text-lg font-bold tabular-nums text-dia-yellow">{value}</dd></div>;
}
