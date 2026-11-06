"use client";

import { Component, useState, type ReactNode } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { FORMATIONS } from "@/lib/formations";
import { SavedMatchPlan } from "./SavedMatchPlan";
import { canonicalPosition } from "@/lib/coachAssistant/history";
import { testWorkspace } from "@/lib/coachAssistant/testWorkspace";
import { useAutomaticCoachHistory } from "@/hooks/useAutomaticCoachHistory";
import type { AssistantPlayer } from "@/lib/coachAssistant/types";
import type { Id } from "@/convex/_generated/dataModel";
import type { DemoPlan } from "@/lib/substitutions/demoPlan";
import { validatePortableSubstitutionPlan } from "@/lib/substitutions/validatePortableSubstitutionPlan";
import { SubstitutionDemo, type DemoSource } from "@/components/substitutions/SubstitutionDemo";
import { CoachAssistantPanel, type AssistantPreparationSettings } from "./CoachAssistantPanel";
import { MatchPreparationSteps } from "./MatchPreparationSteps";

type Workspace = NonNullable<FunctionReturnType<typeof api.coachAssistant.workspace>>;
const control = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm";
const button = "min-h-11 rounded-xl bg-dia-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
function dateInAmsterdam(timestamp: number | null) {
  if (timestamp === null) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(timestamp);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

class WorkspaceErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error.message.match(/Uncaught Error: ([^\n]+)/)?.[1];
    return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{message ?? "De wedstrijd kan niet worden geladen. Controleer de code, je coachtoegang en de verbinding."}</p>;
  }
}

export function CoachAssistantWorkspace({ initialCode, testMode = false }: { initialCode: string; testMode?: boolean }) {
  const { user } = useUser();
  const accountId = user?.id;
  const normalizedCode = initialCode.trim().toUpperCase();
  const [code, setCode] = useState(/^[A-Z0-9]{6}$/.test(normalizedCode) ? normalizedCode : "");
  const [codeInput, setCodeInput] = useState(normalizedCode);
  const [inputError, setInputError] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const { isAuthenticated, isLoading } = useConvexAuth();
  // This is a coach workspace; admin season browsing belongs to the admin dashboard.
  const dashboard = useQuery(api.matches.verifyCoachAccess, isAuthenticated ? {} : "skip");
  const teamScope = teamFilter ?? dashboard?.matches.find((match) => match.publicCode === code)?.teamId ?? "";
  const upcoming = (dashboard?.matches ?? []).filter((match) => (match.status === "scheduled" || match.status === "lineup") && (!teamScope || match.teamId === teamScope))
    .sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity));
  return <main className="min-h-screen bg-slate-50 pb-8">
    <header className="border-b border-slate-200 bg-white px-4 py-5"><div className="mx-auto max-w-7xl"><Link href="/coach" className="text-sm font-semibold text-dia-green underline underline-offset-4">Naar coachdashboard</Link><h1 className="mt-3 text-2xl font-bold">Wedstrijd voorbereiden & oefenen</h1><p className="mt-2 text-sm text-slate-600">Kies je wedstrijd, bereid de opstelling en het wisselplan voor en oefen daarna op dezelfde pagina. Je gebruikt in elke stap hetzelfde wedstrijdconcept.</p></div></header>
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      {testMode && <section aria-label="Lokale testvoorbereiding" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><h2 className="font-bold">Testvoorbereiding · alleen lokaal</h2><p className="mt-1">Je leest de echte wedstrijdselectie. Voorstellen, wijzigingen en de oefenklok blijven op dit scherm. Opslaan in de wedstrijd is uitgeschakeld. Posities en beschikbaarheid blijven in deze browser bewaard. Herladen wist je oefenconcept; je kunt het wisselplan afdrukken om het te bewaren.</p></section>}
      {isLoading && <p role="status">Coachverbinding laden…</p>}
      {!isLoading && !isAuthenticated && <p>Log in als coach om wedstrijden te laden. <Link href="/sign-in" className="font-semibold text-dia-green underline">Inloggen</Link></p>}
      {isAuthenticated && <><section aria-label="Wedstrijd kiezen" className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-4 grid gap-2 text-sm font-semibold">Team<select className={control} value={teamScope} onChange={(event) => { setTeamFilter(event.target.value); setCode(""); setCodeInput(""); setInputError(null); }}><option value="">Mijn coachteams</option>{(dashboard?.teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Wedstrijd kiezen<select className={control} value={code} onChange={(event) => { setCode(event.target.value); setCodeInput(event.target.value); setInputError(null); }}>
          <option value="">Kies een wedstrijd die nog niet begonnen is</option>
          {code && !upcoming.some((match) => match.publicCode === code) && <option value={code}>Geselecteerde code: {code}</option>}
          {upcoming.map((match) => <option key={match._id} value={match.publicCode}>{match.teamName} – {match.opponent} · {dateInAmsterdam(match.scheduledAt ?? null) || "datum nog bepalen"} · {match.publicCode}</option>)}
        </select></label>
        {dashboard === undefined && <p role="status" className="mt-2 text-sm text-slate-500">Wedstrijden laden…</p>}
        {dashboard === null && <p className="mt-2 text-sm text-amber-800">Geen coachwedstrijden gevonden. Controleer de teamkoppeling van je account.</p>}
        <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); const next = codeInput.trim().toUpperCase(); if (!/^[A-Z0-9]{6}$/.test(next)) { setInputError("Vul een wedstrijdcode van zes letters of cijfers in."); return; } setCode(next); setInputError(null); }}><label className="grid gap-2 text-sm font-medium">Of kies met wedstrijdcode<input className={`${control} uppercase`} maxLength={6} value={codeInput} onChange={(event) => setCodeInput(event.target.value)} autoCapitalize="characters" /></label><button className={button} type="submit">Wedstrijd laden</button></form>
        {inputError && <p role="alert" className="mt-2 text-sm text-red-800">{inputError}</p>}
        <p className="mt-3 text-xs text-slate-500">{testMode ? "Een andere wedstrijd kiezen begint een nieuwe lokale test. Druk het concept af als je het wilt bewaren." : "Een andere wedstrijd kiezen begint een nieuw concept. Sla een beoordeeld concept eerst op als je het wilt bewaren."}</p>
      </section>
      {code ? <WorkspaceErrorBoundary key={`${testMode ? "test" : "app"}:${code}`}>{testMode
        ? <SelectedTestMatch accountId={accountId} key={code} code={code} matchId={dashboard?.matches.find((match) => match.publicCode === code)?._id} loading={dashboard === undefined} />
        : <SelectedMatch accountId={accountId} key={code} code={code} testMode={false} />}</WorkspaceErrorBoundary> : <p className="p-4 text-sm text-slate-600">Kies hierboven een wedstrijd om een opstelling en wisselplan te laten voorstellen.</p>}
      </>}
    </div>
  </main>;
}

function SelectedTestMatch({ code, matchId, loading, accountId }: { accountId?: string; code: string; matchId?: Id<"matches">; loading: boolean }) {
  const match = useQuery(api.matches.getForCoach, matchId ? { matchId } : "skip");
  const [loadKey, setLoadKey] = useState(0);
  if (loading) return <p role="status">Coachtoegang controleren…</p>;
  if (!matchId) return <p role="alert">Deze wedstrijd hoort niet bij je coachteams. Kies een wedstrijd waarvoor je coachtoegang hebt.</p>;
  if (match === undefined) return <p role="status">Selectie van {code} laden voor de lokale test…</p>;
  if (!match || match.publicCode !== code) return <p role="alert">De wedstrijd kan niet met jouw coachtoegang worden geladen.</p>;
  return <ConnectedEditor key={loadKey} current={testWorkspace(match)} accountId={accountId} testMode onReload={() => setLoadKey((value) => value + 1)} />;
}

function SelectedMatch({ code, testMode, accountId }: { accountId?: string; code: string; testMode: boolean }) {
  const workspace = useQuery(api.coachAssistant.workspace, { code });
  const [loadKey, setLoadKey] = useState(0);
  if (workspace === undefined) return <p role="status">Selectie en plan van {code} laden…</p>;
  if (workspace === null) return <p role="alert">Er is geen wedstrijd met code {code} gevonden.</p>;
  return <ConnectedEditor key={loadKey} current={workspace} accountId={accountId} testMode={testMode} onReload={() => setLoadKey((value) => value + 1)} />;
}

export function ConnectedEditor({ current, onReload, testMode = false, accountId }: { accountId?: string; current: Workspace; onReload: () => void; testMode?: boolean }) {
  const [snapshot] = useState(current);
  const preferenceScope = accountId ? `${accountId}:${snapshot.teamId}` : undefined;
  const [formationId, setFormationId] = useState(snapshot.plan.formation.id ?? "11v11_1-4-3-3");
  const [fallbackTab, setFallbackTab] = useState<"assistant" | "review">(current.plan.steps.length ? "review" : "assistant");
  const [prepared, setPrepared] = useState<DemoPlan | null>(null);
  const [preparedSettings, setPreparedSettings] = useState<AssistantPreparationSettings>();
  const [preparedPlayers, setPreparedPlayers] = useState<AssistantPlayer[] | null>(null);
  const automaticHistory = useAutomaticCoachHistory(snapshot.teamId, dateInAmsterdam(snapshot.scheduledAt));
  const save = useMutation(api.coachAssistant.save);
  const [savedRevision, setSavedRevision] = useState(snapshot.revision);
  const stale = current.revision !== savedRevision;
  const disabled = stale || !current.canSave;
  const selectedFormation = FORMATIONS[formationId];
  const sourcePlan: DemoPlan = selectedFormation ? { ...snapshot.plan,
    formation: { id: formationId, name: selectedFormation.name, slots: selectedFormation.slots },
    match: { ...snapshot.plan.match, fieldPlayerCountIncludingKeeper: selectedFormation.slots.length } } : snapshot.plan;
  const plan = prepared ?? sourcePlan;
  const report = validatePortableSubstitutionPlan(plan);
  const preferences = snapshot.preferences.map((player) => {
    const selected = plan.players.find((p) => p.key === player.key);
    return { ...player, availability: selected?.unavailableReason === "injured" ? "injured" as const : selected?.absent ? "absent" as const : "present" as const,
      primaryPosition: canonicalPosition(player.primaryPosition), secondaryPosition: canonicalPosition(player.secondaryPosition) };
  });
  const label = `${snapshot.teamName} – ${snapshot.opponent} (${snapshot.code})`;
  const source: DemoSource = { id: snapshot.code, kind: "app", initialPlan: plan, initialPlanIsProposal: prepared !== null, teamName: snapshot.teamName, teamKey: String(snapshot.teamId), matchLabel: label,
    sourceUrl: `/coach/match/${snapshot.matchId}`, notes: snapshot.warnings, targetDate: dateInAmsterdam(snapshot.scheduledAt), initialPlayers: preparedPlayers ?? preferences, preparationSettings: preparedSettings, preferenceScope,
    assistantHistory: automaticHistory.matches, historyLoading: automaticHistory.loading, historyWarnings: automaticHistory.warnings };
  const connection = { label, disabled, onSave: async (approved: DemoPlan, requestId: string) => {
    if (testMode) throw new Error("Deze testvoorbereiding kan niet naar de wedstrijd schrijven.");
    if (disabled) throw new Error("Laad eerst de actuele wedstrijdgegevens. Opslaan is nu niet beschikbaar.");
    const result = await save({ matchId: snapshot.matchId, expectedRevision: savedRevision, reviewed: true, requestId, plan: approved });
    if (result?.revision) setSavedRevision(result.revision);
  } };
  return <section aria-label="Gekozen wedstrijd" className="space-y-4">
    <div className="rounded-xl border border-green-200 bg-green-50 p-4"><h2 className="font-bold">{label}</h2><div className="mt-2 flex flex-wrap gap-4 text-sm"><Link className="font-semibold text-dia-green underline" href={`/coach/match/${snapshot.matchId}`}>Open wedstrijd in de app</Link><Link className="font-semibold text-dia-green underline" href={`/live/${snapshot.code}`}>Open publieke weergave</Link><button type="button" className="min-h-11 font-semibold text-dia-green underline" onClick={onReload}>Actuele selectie en plan opnieuw laden</button></div></div>
    {snapshot.scheduledAt === null && <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950">Deze wedstrijd heeft nog geen datum in de app. Vul bij de Coachassistent een datum voor het voorstel in; de geplande wedstrijddatum wijzig je via de wedstrijdinstellingen.</p>}
    {stale && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">De gegevens in de app zijn gewijzigd, bijvoorbeeld door opslaan. Je kunt je concept en beginopstelling hier verder aanpassen. Laad de actuele selectie en het plan opnieuw voordat je nogmaals opslaat.</p>}
    {!current.canSave && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Deze wedstrijd kan niet meer als beginplan worden opgeslagen. Kies een niet-afgelaste wedstrijd die nog niet is begonnen.</p>}
    {!report.structurallyValid || !report.simulationComplete ? <>
      <MatchPreparationSteps active={fallbackTab} planReady={plan.steps.length > 0} onSelect={(tab) => { if (tab === "assistant" || tab === "review") setFallbackTab(tab); }} />
      {fallbackTab === "review" && plan.steps.length > 0 ? <SavedMatchPlan plan={plan} report={report} matchUrl={`/coach/match/${snapshot.matchId}/wisselplan`} /> : <>
      <p className="text-sm text-slate-600">Begin bij de selectie hieronder. Na het berekenen zet je het voorstel klaar bij Wisselplan; na je controle wordt Oefenen beschikbaar.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm">De huidige opstelling of wissellijst is nog niet volledig. Kies een formatie. Je kunt zelf de beginopstelling kiezen en de wissels laten berekenen, of een volledig voorstel laten maken.</p>
        <label className="mt-3 grid gap-2 text-sm font-semibold">Formatie voor deze wedstrijd<select className={control} value={formationId} onChange={(event) => { setFormationId(event.target.value); setPrepared(null); }}>{!selectedFormation && <option value={formationId}>{snapshot.plan.formation.name}</option>}{Object.entries(FORMATIONS).map(([id, formation]) => <option key={id} value={id}>{formation.name} · {formation.slots.length}-tal</option>)}</select></label>
        {snapshot.warnings.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-amber-800">{snapshot.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      </div>
      <CoachAssistantPanel key={formationId} preferenceScope={preferenceScope} connected preparationFlow testOnly={testMode} initialPlayers={preparedPlayers ?? preferences} automaticHistory={automaticHistory.matches} historyLoading={automaticHistory.loading} historyWarnings={automaticHistory.warnings} plan={sourcePlan} teamKey={String(snapshot.teamId)} targetDate={dateInAmsterdam(snapshot.scheduledAt)} disabled={false} onApply={(next, players, settings) => { setPrepared(next); setPreparedPlayers(players ?? null); setPreparedSettings(settings); }} />
      </>}
    </> : <SubstitutionDemo key={`${formationId}-${prepared ? "proposal" : "saved"}`} source={source} connection={connection} testOnly={testMode} initialTab={prepared || plan.steps.length > 0 ? "review" : "assistant"} />}
  </section>;
}
