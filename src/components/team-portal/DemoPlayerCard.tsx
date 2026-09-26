"use client";

import { Sparkles } from "lucide-react";
import { cardNameLines } from "@/lib/cards/formatCardName";
import type { DemoPlayer } from "@/lib/team-portal/types";
import { useDemoProfile } from "./DemoProfileContext";

interface DemoPlayerCardProps {
  player: DemoPlayer;
  compact?: boolean;
}

/** A local, illustrated card: no player photos, scores or external assets. */
export function DemoPlayerCard({ player, compact = false }: DemoPlayerCardProps) {
  const profile = useDemoProfile();
  return (
    <article aria-label={`Spelerskaart van ${player.name}`} className="relative isolate overflow-hidden rounded-[1.75rem] border border-emerald-800 bg-[#063d2d] text-white shadow-xl shadow-emerald-950/10">
      <div className={`relative overflow-hidden ${compact ? "aspect-[5/4]" : "aspect-[6/5]"}`}>
        <div aria-hidden="true" className="absolute -right-12 -top-10 h-64 w-64 rounded-full border-[35px] border-white/[0.035]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-[#063d2d] to-transparent" />
        <div className="absolute left-5 top-5 z-10">
          <p className={`${compact ? "text-3xl" : "text-4xl"} font-black leading-none tracking-tight text-dia-yellow`}>{player.number}</p>
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-100">{profile.teamName}</p>
        </div>
        {/* The club logo is already bundled in the app. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/dia.png" alt="DIA" width={42} height={42} className="absolute right-5 top-5 z-10 h-10 w-10 object-contain" />
        <svg aria-hidden="true" focusable="false" viewBox="0 0 320 260" className="absolute inset-0 h-full w-full">
          <ellipse cx="169" cy="243" rx="89" ry="9" fill="#012b20" opacity="0.6" />
          <path d="M119 63 78 79 45 127 84 154 105 127 101 233Q165 247 229 233L225 127 246 154 285 127 251 79 210 63 185 57 144 57Z" fill="#efe031" />
          <path d="M119 63 143 57Q165 84 187 57L210 63Q164 109 119 63Z" fill="#073e2d" />
          <path d="M45 127 84 154 92 141 54 113Z M238 141 246 154 285 127 276 113Z" fill="#073e2d" />
          <path d="M105 127 113 114 118 234 101 233Z M225 127 217 114 212 234 229 233Z" fill="#c7bc1e" />
          <path d="M145 89V233M185 89V233" stroke="#fff985" strokeWidth="1.5" opacity="0.4" />
          <path d="m207 97 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#073e2d" />
          <text x="165" y="193" textAnchor="middle" fontSize="74" fontFamily="Arial, sans-serif" fontWeight="900" fill="#073e2d">{player.number}</text>
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-[#063d2d] to-transparent" />
      </div>
      <div className={`${compact ? "px-4 pb-5" : "px-6 pb-6"} relative`}>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200">Eén team. Jouw verhaal.</p>
        <h2 className={`${compact ? "text-2xl" : "text-4xl"} font-black leading-none tracking-tight`}>
          {cardNameLines(player.name, "first").map((line) => <span key={line} className="block">{line}</span>)}
        </h2>
        <p className="mt-2 text-sm font-medium text-emerald-100">{player.position}</p>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          {player.qualities.map((quality) => <span key={quality} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-dia-yellow"><Sparkles aria-hidden="true" className="h-3 w-3" />{quality}</span>)}
        </div>
        {!compact ? <p className="mt-4 text-sm italic leading-relaxed text-emerald-100/80">“{player.motto}”</p> : null}
      </div>
    </article>
  );
}
