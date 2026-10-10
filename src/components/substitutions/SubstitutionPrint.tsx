"use client";

import { Printer } from "lucide-react";
import { DEMO_PLAN, type DemoPlan } from "@/lib/substitutions/demoPlan";
import type { DemoAction, DemoEventSnapshot, DemoFormationState, DemoMatchState } from "@/lib/substitutions/demoMatch";
import { getDemoFormation } from "@/lib/substitutions/demoFormations";
import { validatePortableSubstitutionPlan } from "@/lib/substitutions/validatePortableSubstitutionPlan";
import { getRoleColor } from "@/lib/roleColors";

export type SubstitutionPrintMode = "plan" | "actual";
type PrintProps = { match: DemoMatchState; plan: DemoPlan; approved: boolean; printMode: SubstitutionPrintMode; screenPreview?: boolean; matchLabel?: string; sourceLabel?: string };
type PrintFrame = { id: string; snapshot: DemoEventSnapshot; elapsedSeconds: number; title: string; actions: readonly DemoAction[]; plannedMinute?: number };
type PrintPlayers = DemoMatchState["plan"]["players"];

const PRINT_CSS = `
@page { size: A4 portrait; margin: 8mm; }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; min-height: 0 !important; background: white !important; }
}
  .substitution-print { color: #17232e; font-family: Arial, Helvetica, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .substitution-print-page { width: 194mm; height: 280mm; background: white; display: grid; grid-template-rows: 12mm minmax(0, 1fr) 7mm; gap: 2mm; break-after: page; }
  .substitution-print-page[data-match-label] { grid-template-rows: 15mm minmax(0, 1fr) 7mm; }
  .substitution-print-page:last-child { break-after: auto; }
  .substitution-print-header { display: flex; align-items: start; justify-content: space-between; border-bottom: .35mm solid #1b5e20; }
  .substitution-print-header h1 { font-size: 14pt; line-height: 1.1; font-weight: 800; margin: 0 0 1mm; }
  .substitution-print-header p, .substitution-print-footer { font-size: 8pt; line-height: 1.2; margin: 0; }
  .substitution-print-concept { font-weight: bold; color: #9a3412; }
  .substitution-print-grid { min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 3mm; }
  .substitution-print-frame { min-width: 0; min-height: 0; margin: 0; padding: 1.5mm; border: .2mm solid #cbd5e1; border-radius: 2mm; display: grid; grid-template-rows: minmax(5mm, auto) auto minmax(0, 1fr) auto; row-gap: 1mm; break-inside: avoid; }
  .substitution-print-title { display: flex; justify-content: space-between; gap: 2mm; font-size: 9pt; font-weight: bold; }
  .substitution-print-title span:last-child { font-size: 7pt; font-weight: normal; padding-top: .5mm; }
  .substitution-print-actions { font-size: 7.2pt; line-height: 1.15; padding-top: .5mm; overflow-wrap: anywhere; }
  .substitution-print-actions p { margin: 0; }
  .substitution-print-pitch { display: block; width: 100%; height: 100%; min-height: 0; max-height: 50mm; align-self: center; }
  .substitution-print-bench { font-size: 7.5pt; line-height: 1.2; padding-top: 1mm; overflow-wrap: anywhere; }
  .substitution-print-footer { display: flex; align-items: end; justify-content: space-between; border-top: .2mm solid #cbd5e1; }
`;

function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function missingHistory(match: DemoMatchState): boolean {
  // Sessions already open during a code update may contain events from before snapshots existed.
  return match.events.some((event) => event.type !== "skipped" && !event.snapshot);
}

function playerLabel(players: PrintPlayers, key: string): string {
  const player = players.find((candidate) => candidate.key === key);
  return `${player?.name ?? "Onbekend"} ${player?.number ?? "?"}`;
}

function formationName(formation: DemoFormationState): string {
  return formation.name ?? getDemoFormation(formation.id).name;
}

function actualFrames(match: DemoMatchState): PrintFrame[] {
  return [
    {
      id: "start",
      elapsedSeconds: 0,
      title: "Beginopstelling",
      actions: [],
      snapshot: {
        field: match.plan.startingLineup.field,
        bench: match.plan.startingLineup.bench,
        keeperKey: match.plan.startingLineup.keeperKey,
        formation: match.plan.formation,
      },
    },
    ...match.events.filter((event) => event.type !== "skipped" && event.snapshot).map((event) => ({
      id: event.id,
      snapshot: event.snapshot,
      elapsedSeconds: event.elapsedSeconds,
      plannedMinute: event.plannedMinute,
      actions: event.actions,
      title: event.type === "formation" ? "Andere formatie" : event.actions.length && event.actions.every((action) => action.kind === "positionSwap") ? "Positieruil" : "Wissel",
    })),
  ];
}

function printData({ match, plan, printMode }: PrintProps): { frames: PrintFrame[]; error?: string } {
  if (printMode === "actual") {
    if (missingHistory(match)) return { frames: [], error: "Deze oudere oefensessie mist opgeslagen veldbeelden. Start de demo opnieuw om de uitvoering met veldplaatjes af te drukken." };
    if (match.phase === "ready") return { frames: [], error: "Start eerst de demo. Daarna kun je de uitgevoerde opstellingen afdrukken." };
    return { frames: actualFrames(match) };
  }
  const report = validatePortableSubstitutionPlan(plan);
  if (!report.structurallyValid || !report.simulationComplete) {
    return { frames: [], error: report.issues.find((issue) => issue.severity === "error")?.message ?? "Controleer eerst de fouten in het wisselplan." };
  }
  return {
    frames: report.snapshots.map((snapshot) => {
      const step = plan.steps.find((candidate) => candidate.id === snapshot.stepId);
      return {
        id: snapshot.stepId ?? "start",
        elapsedSeconds: snapshot.matchMinute * 60,
        title: step ? "Geplande wissel" : "Beginopstelling",
        actions: step?.actions ?? [],
        snapshot: { ...snapshot, formation: plan.formation },
      };
    }),
  };
}

function HalfPitch({ players, snapshot }: { players: PrintPlayers; snapshot: DemoEventSnapshot }) {
  return (
    <svg viewBox="0 0 420 324" className="substitution-print-pitch" role="img" aria-label="Half veld met spelers, namen en rugnummers" preserveAspectRatio="xMidYMid meet">
      <rect x="1" y="1" width="418" height="322" rx="4" fill="#f0f7ee" stroke="#92b78a" />
      <g fill="none" stroke="#b6cdb0" strokeWidth="1">
        <path d="M 9 9 H 411 V 315 H 9 Z M 91 315 V 219 H 329 V 315 M 156 315 V 283 H 264 V 315" />
        <path d="M 156 9 A 54 54 0 0 0 264 9 M 166.5 219 A 54 54 0 0 1 253.5 219 M 188 315 V 322 H 232 V 315" />
        <circle cx="210" cy="251" r="1.5" fill="#b6cdb0" />
      </g>
      {snapshot.field.map((entry) => {
        const slot = snapshot.formation.slots.find((candidate) => candidate.id === entry.slotId);
        const fallback = DEMO_PLAN.formation.slots.find((candidate) => candidate.id === entry.slotId);
        const x = ((slot?.x ?? fallback?.x ?? 50) / 100) * 420;
        const y = 5 + ((slot?.y ?? fallback?.y ?? 50) / 100) * 305;
        const player = players.find((candidate) => candidate.key === entry.playerKey);
        const name = player?.name ?? "Onbekend";
        const role = getRoleColor(slot?.position);
        return (
          <g key={entry.playerKey} transform={`translate(${x} ${y})`}>
            <title>{`${playerLabel(players, entry.playerKey)}, ${slot?.position ?? "positie onbekend"}`}</title>
            <path d="M -10 -20 H 10 L 17 -13 V -1 Q 16 6 0 10 Q -16 6 -17 -1 V -13 Z" fill={role.bg} stroke="#17232e" strokeWidth="1.1" />
            <text x="0" y="0" textAnchor="middle" fill={role.text} fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="17">{player?.number ?? "?"}</text>
            <text x="0" y="24" textAnchor="middle" fill="#17232e" stroke="#f0f7ee" strokeWidth="3.5" paintOrder="stroke" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="15.5" textLength={name.length > 10 ? 100 : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** A screen control; keep the companion print pages outside any print:hidden ancestor. */
export function SubstitutionPrintButton(props: PrintProps & { onModeChange: (mode: SubstitutionPrintMode) => void }) {
  const { frames, error } = printData(props);
  const pages = Math.max(1, Math.ceil(frames.length / 6));
  return (
    <div className="print:hidden">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Afdrukken<select aria-label="Kies wat je wilt afdrukken" value={props.printMode} onChange={(event) => props.onModeChange(event.target.value as SubstitutionPrintMode)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"><option value="plan">Wisselplan vooraf</option><option value="actual">Uitvoering achteraf</option></select></label>
        <button type="button" disabled={Boolean(error)} onClick={() => window.print()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Printer className="h-4 w-4" aria-hidden="true" /> {props.printMode === "plan" ? "Wisselplan" : "Uitvoering"} afdrukken · {pages} A4
        </button>
      </div>
      {error ? <p className="mt-2 max-w-xl text-xs text-amber-800">{error}</p>
        : <p className="mt-2 text-xs text-slate-500">{props.printMode === "plan" ? `${props.approved ? "Gecontroleerd plan" : "Conceptplan, nog niet bevestigd"}. ` : "Werkelijk uitgevoerde wijzigingen. "}Zes veldplaatjes per A4.</p>}
    </div>
  );
}

/** Keep the planned sequence and actual event history explicitly separate in printed output. */
export function SubstitutionPrint(props: PrintProps) {
  const { match, plan, approved, printMode, screenPreview = false } = props;
  const { frames, error } = printData(props);
  if (error) return null;
  const pageCount = Math.ceil(frames.length / 6);
  const skipped = match.events.filter((event) => event.type === "skipped");
  const players = printMode === "plan" ? plan.players : match.plan.players;
  const unavailable = players.filter((player) => player.absent);
  const concept = printMode === "plan" && !approved;
  const timeLabel = printMode === "plan" ? `${plan.match.regulationDurationMinutes} minuten` : clock(match.elapsedSeconds);
  return (
    <div className={`substitution-print ${screenPreview ? "space-y-4 print:hidden" : "hidden print:block"}`}>
      <style>{PRINT_CSS}</style>
      {Array.from({ length: pageCount }, (_, pageIndex) => (
        <section key={pageIndex} className="substitution-print-page" data-match-label={props.matchLabel || undefined}>
          <header className="substitution-print-header">
            <div><h1>DIA · {printMode === "plan" ? "Wisselplan" : "Uitvoering demo"}</h1>{props.matchLabel && <p>{props.matchLabel}</p>}<p className={concept ? "substitution-print-concept" : undefined}>{concept ? "CONCEPT · Nog niet bevestigd" : printMode === "plan" ? "Gecontroleerd wisselplan" : "Veldbeelden na de uitgevoerde wissels"} · {formationName(printMode === "plan" ? plan.formation : match.plan.formation)}</p></div>
            <div className="max-w-56 text-right"><p>{printMode === "actual" ? `${match.phase === "finished" ? "Eindstand" : "Tussenstand"} bij ` : ""}{timeLabel}</p>{unavailable.length > 0 && <p>Niet beschikbaar: {unavailable.map((player) => `${playerLabel(players, player.key)}${player.unavailableReason === "injured" ? " (geblesseerd)" : ""}`).join(" · ")}</p>}</div>
          </header>
          <div className="substitution-print-grid">
            {frames.slice(pageIndex * 6, (pageIndex + 1) * 6).map(({ id, snapshot, actions, elapsedSeconds, title, plannedMinute }) => {
              const lateOrEarly = plannedMinute !== undefined && plannedMinute * 60 !== elapsedSeconds;
              return (
                <figure key={id} className="substitution-print-frame">
                  <figcaption className="substitution-print-title"><span>{clock(elapsedSeconds)} · {title}</span><span>{lateOrEarly ? `Plan: ${clock(plannedMinute! * 60)}` : ""}</span></figcaption>
                  <div className="substitution-print-actions">
                    {!actions.length ? <p>{formationName(snapshot.formation)}</p> : null}
                    {actions.map((action) => <p key={action.id}>{action.kind === "positionSwap" ? "Positie: " : "Uit → in: "}{playerLabel(players, action.playerOutKey)} {action.kind === "positionSwap" ? "↔" : "→"} {playerLabel(players, action.playerInKey)}</p>)}
                  </div>
                  <HalfPitch players={players} snapshot={snapshot} />
                  <div className="substitution-print-bench"><strong>Bank:</strong> {snapshot.bench.map((key) => playerLabel(players, key)).join(" · ")}</div>
                </figure>
              );
            })}
          </div>
          <footer className="substitution-print-footer"><span>{printMode === "plan" ? concept ? "Conceptplan · controleer vóór gebruik" : "Wisselplan vooraf" : "Lokale oefenwedstrijd"}{props.sourceLabel ? ` · ${props.sourceLabel}` : ""}{printMode === "actual" && skipped.length ? ` · ${skipped.length} gepland wisselmoment${skipped.length === 1 ? "" : "en"} overgeslagen` : ""}</span><span>Blad {pageIndex + 1} / {pageCount} · {timeLabel}</span></footer>
        </section>
      ))}
    </div>
  );
}
