"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ClipboardList, Eye, FlaskConical, Heart, LayoutGrid, RotateCcw, ShieldCheck, Sparkles, TrendingUp, Trophy, Users, X } from "lucide-react";
import { useTeamPortalDemo } from "@/hooks/useTeamPortalDemo";
import { getMatchPhase } from "@/lib/team-portal/selectors";
import { GENERAL_DEMO_PROFILE, type DemoProfile } from "@/lib/team-portal/demoProfiles";
import type { DemoActor, DemoMatch } from "@/lib/team-portal/types";
import { CoachWorkspace } from "./CoachWorkspace";
import { DemoProfileProvider, useDemoProfile } from "./DemoProfileContext";
import { MemberOverview } from "./MemberOverview";
import { ObservationWorkspace } from "./ObservationWorkspace";
import { PlayerReviewWorkspace } from "./PlayerReviewWorkspace";
import { TeamOverview } from "./TeamOverview";
import { VotingPanel } from "./VotingPanel";

type Tab = "overview" | "development" | "team" | "voting" | "coach" | "observations" | "reviews";
const phaseLabels = { preparing: "Acties klaarzetten", voting: "Stemmen is open", closed: "Uitslag bekend" };

export function TeamPortalDemo({ profile = GENERAL_DEMO_PROFILE }: { profile?: DemoProfile }) {
  return <DemoProfileProvider profile={profile}><TeamPortalDemoContent key={profile.id} /></DemoProfileProvider>;
}

function TeamPortalDemoContent() {
  const profile = useDemoProfile();
  const { state, actor, setActor, now, ready, run, reset, storageWarning, notice, dismissNotice } = useTeamPortalDemo(profile);
  const [tab, setTab] = useState<Tab>("overview");
  const [matchId, setMatchId] = useState("m1");
  const [childId, setChildId] = useState("p1");
  const match = state.matches.find((item) => item.id === matchId) ?? state.matches[0];
  const guardian = actor.role === "parent" ? state.guardians.find((item) => item.id === actor.guardianId) : null;
  const activePlayerId = actor.role === "player" ? actor.playerId : guardian?.childrenIds.includes(childId) ? childId : guardian?.childrenIds[0] ?? state.players[0].id;
  const activePlayer = state.players.find((player) => player.id === activePlayerId) ?? state.players[0];
  const tabs: { id: Tab; label: string; icon: typeof Users }[] = actor.role === "coach"
    ? [{ id: "reviews", label: "Nabespreking", icon: ClipboardList }, { id: "coach", label: "Ontwikkeling", icon: TrendingUp }, { id: "observations", label: "Observaties", icon: Eye }, { id: "voting", label: "Wedstrijdwaardering", icon: Trophy }, { id: "team", label: "Het team", icon: Users }]
    : actor.role === "scout"
      ? [{ id: "observations", label: "Observaties", icon: Eye }]
      : actor.role === "parent"
        ? [{ id: "overview", label: "Mijn kind", icon: Heart }, { id: "team", label: "Het team", icon: Users }, { id: "voting", label: "Wedstrijden", icon: Trophy }]
        : [{ id: "overview", label: "Mijn kaart", icon: LayoutGrid }, { id: "development", label: "Mijn ontwikkeling", icon: TrendingUp }, { id: "team", label: "Het team", icon: Users }, { id: "voting", label: "Stemmen", icon: Trophy }];
  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0].id;

  const changeRole = (role: DemoActor["role"]) => {
    setActor(role === "coach" || role === "scout" ? { role } : role === "player" ? { role, playerId: state.players[0].id } : { role, guardianId: state.guardians[0].id });
    setTab(role === "coach" ? "reviews" : role === "scout" ? "observations" : "overview");
    dismissNotice();
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const openVoting = () => {
    const openMatch = state.matches.find((item) => getMatchPhase(item, now) === "voting" && (actor.role !== "player" || item.participantIds.includes(actor.playerId)));
    setMatchId(openMatch?.id ?? match.id);
    changeTab("voting");
  };
  const headings: Record<Tab, { eyebrow: string; title: string; text: string }> = {
    overview: { eyebrow: actor.role === "parent" ? "Een kijkje in de ontwikkeling" : "Jouw club. Jouw verhaal.", title: actor.role === "parent" ? `Samen groeien met ${activePlayer.name}` : `Hé ${activePlayer.name}, dit is jouw team.`, text: actor.role === "parent" ? "Volg de mooie momenten en de volgende stap van je kind." : "Vier je mooie momenten. Ontdek wat je kunt. Help elkaar vooruit." },
    development: { eyebrow: "Stap voor stap vooruit", title: "Jouw groei telt.", text: "Dit ziet je coach al bij jou. En hier werken jullie samen aan." },
    team: { eyebrow: `${profile.teamName} · seizoen ${profile.seasonLabel}`, title: profile.roster ? `${state.players.length} spelers. Eén team.` : profile.pilot ? "Voorbeeldspelers. Eén team." : "Twaalf spelers. Eén team.", text: profile.roster ? "Onze selectie, uitslagen, programma en stand uit DIA Live." : profile.pilot ? "Een fictieve selectie om de teamervaring samen uit te proberen." : "Ieder een eigen kracht. Samen maken we er iets moois van." },
    voting: { eyebrow: "Een compliment maakt het verschil", title: actor.role === "coach" ? "Geef mooie momenten een podium." : "Wie maakte het verschil?", text: actor.role === "parent" ? "Bekijk de positieve acties en de uitslagen van de teamverkiezingen." : "Een fijne teamgenoot, een slimme pass of een geweldige redding. Laat het weten." },
    coach: { eyebrow: "De coachwerkplek", title: "Aandacht voor iedere speler.", text: "Een concreet compliment vandaag. Een mooie volgende stap voor morgen." },
    reviews: { eyebrow: "Na elke wedstrijd", title: "Wat zag je bij iedere speler?", text: "Drie vragen. Eén persoonlijk verslag. Meer aandacht voor wat je samen hebt gezien." },
    observations: { eyebrow: "Professionele observaties", title: "Kijk gericht. Leg ontwikkeling vast.", text: "Een aparte werkplek voor coaches en scouts, buiten de speler- en ouderweergave." },
  };
  const heading = headings[activeTab];
  const matchLabel = (item: DemoMatch) => {
    const source = profile.roster?.matches?.find((record) => record.id === item.id);
    if (source) return `${source.isHome ? profile.teamName : source.opponent} – ${source.isHome ? source.opponent : profile.teamName} · ${source.homeScore} – ${source.awayScore} · ${item.dateLabel}`;
    return `${profile.pilot ? profile.teamName : "DIA"} – ${item.opponent} · ${item.score}`;
  };

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-[#f6f7f2] text-dia-green"><p className="flex items-center gap-3 font-semibold"><Sparkles size={22} /> Jouw demo wordt klaargezet…</p></main>;

  return (
    <div className="min-h-screen bg-[#f6f7f2] pb-24 text-stone-900 sm:pb-8">
      <a href="#teamportal-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-dia-green focus:p-3 focus:text-white">Naar de inhoud</a>
      <div className="border-b border-[#e7dfce] bg-[#f0ebdf]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <p className="flex items-center gap-2 text-xs font-medium text-[#605742]"><FlaskConical size={15} /><span><strong>{profile.pilot ? `${profile.teamName} · pilotdemo` : "DIA Team · demo"}</strong><span className={profile.pilot ? "block sm:inline" : "hidden sm:inline"}>{profile.roster ? " · echte teamgegevens, lokale demo" : " · fictieve spelers, lokaal opgeslagen"}</span></span></p>
          {!profile.pilot ? <Link href="/demo/teamportaal/jo13-2" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#605742] hover:bg-white/50">Open JO13-02-pilot <ArrowUpRight size={14} /></Link> : null}
          <button type="button" onClick={() => { reset(); setTab("overview"); setMatchId("m1"); setChildId("p1"); }} className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#605742] hover:bg-white/50"><RotateCcw size={13} /> Reset demo</button>
        </div>
      </div>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-dia-green"><ShieldCheck className="size-7 text-dia-yellow" strokeWidth={1.5} /></div><div><p className="text-xl font-black tracking-tight">DIA<span className="font-medium text-stone-400"> Team</span></p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Samen groeien</p></div></div>
            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-label="Demo bekijken als" className="flex rounded-xl bg-stone-100 p-1">{([{ role: "player", label: "Speler" }, { role: "parent", label: "Ouder" }, { role: "coach", label: "Coach" }, { role: "scout", label: "Scout" }] as const).map((option) => <button key={option.role} type="button" aria-pressed={actor.role === option.role} onClick={() => changeRole(option.role)} className={`min-h-11 rounded-lg px-3 text-xs font-bold transition sm:px-4 ${actor.role === option.role ? "bg-white text-dia-green shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>{option.label}</button>)}</div>
              {actor.role === "player" ? <label className="flex items-center gap-2 text-xs font-semibold text-stone-500"><span className="sr-only">Spelerprofiel</span><select aria-label="Spelerprofiel" value={actor.playerId} onChange={(event) => { setActor({ role: "player", playerId: event.target.value }); dismissNotice(); }} className="min-h-11 max-w-[240px] rounded-xl border border-stone-200 bg-white py-2 pl-3 pr-7 text-sm font-semibold text-stone-800">{state.players.map((player) => <option key={player.id} value={player.id}>{player.name}{player.number !== null ? ` · #${player.number}` : ""}</option>)}</select></label> : null}
              {actor.role === "parent" && profile.roster ? <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-500"><span>Oudersimulatie</span><select aria-label="Oudersimulatie" value={actor.guardianId} onChange={(event) => { setActor({ role: "parent", guardianId: event.target.value }); dismissNotice(); }} className="min-h-11 max-w-[240px] rounded-xl border border-stone-200 bg-white py-2 pl-3 pr-7 text-sm font-semibold text-stone-800">{state.guardians.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
              {actor.role === "parent" ? <label className="flex items-center gap-2 text-xs font-semibold text-stone-500"><span className="sr-only">Mijn kind</span><select aria-label="Mijn kind" value={activePlayerId} onChange={(event) => setChildId(event.target.value)} className="min-h-11 rounded-xl border border-stone-200 bg-white py-2 pl-3 pr-7 text-sm font-semibold text-stone-800">{state.players.filter((player) => guardian?.childrenIds.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label> : null}
            </div>
          </div>
          {profile.pilot ? <p className="pb-4 text-sm leading-relaxed text-stone-500">Ingericht voor <strong className="text-stone-700">{profile.teamName}</strong>{profile.roster ? ". Selectie en wedstrijdgegevens zijn lokaal overgenomen uit DIA Live. Beoordelingen en stemmen blijven in deze browser. De rolwisselaar en ouderkoppelingen zijn simulaties." : ", met fictieve voorbeeldspelers en wedstrijden."}</p> : null}
          <nav aria-label="Teamportaal" className="hidden items-center gap-6 sm:flex">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={activeTab === id ? "page" : undefined} onClick={() => changeTab(id)} className={`flex min-h-14 items-center gap-2 border-b-[3px] px-1 text-sm font-semibold ${activeTab === id ? "border-dia-green text-dia-green" : "border-transparent text-stone-500 hover:text-stone-900"}`}><Icon size={17} />{label}</button>)}</nav>
        </div>
      </header>
      <main id="teamportal-content" className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.19em] text-dia-green sm:text-xs">{heading.eyebrow}</p><h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-3xl">{heading.title}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">{heading.text}</p></div>{activeTab === "overview" && actor.role === "player" ? <button type="button" onClick={openVoting} className="flex min-h-11 items-center gap-3 rounded-xl bg-dia-green px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-dia-green-dark">Geef je stem <ArrowUpRight size={17} /></button> : null}</div>
        {storageWarning ? <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{storageWarning}</p> : null}
        {profile.pilot && profile.teamSlug && actor.role === "coach" && (activeTab === "coach" || activeTab === "reviews") ? <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="text-lg font-bold text-emerald-950">Terugkijken met de echte wedstrijdgegevens</h2><p className="mt-2 text-sm leading-relaxed text-emerald-900">Bekijk uitslag, doelpunten, kaarten, wissels en geregistreerde speeltijd van {profile.teamName}. Hiervoor log je in met je eigen coachaccount.</p><Link prefetch={false} href={`/team/${profile.teamSlug}/verslag`} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-dia-green px-4 py-3 text-sm font-bold text-white">Open wedstrijdverslag <ArrowUpRight size={17} aria-hidden="true" /></Link></section> : null}
        {(activeTab === "voting" || activeTab === "coach" || activeTab === "reviews") ? <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4"><label className="flex flex-wrap items-center gap-3 text-sm font-semibold"><span className="text-stone-500">Wedstrijd</span><select aria-label="Wedstrijd" value={match.id} onChange={(event) => setMatchId(event.target.value)} className="min-h-11 max-w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold">{state.matches.map((item) => <option key={item.id} value={item.id}>{matchLabel(item)}</option>)}</select></label><span className={`rounded-full px-3 py-2 text-xs font-bold ${getMatchPhase(match, now) === "voting" ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"}`}>{phaseLabels[getMatchPhase(match, now)]}</span></section> : null}
        {activeTab === "overview" || activeTab === "development" ? <MemberOverview key={`${actor.role}-${activePlayerId}-${activeTab}`} state={state} actor={actor} playerId={activePlayerId} now={now} onVote={openVoting} view={activeTab === "development" ? "development" : "profile"} /> : null}
        {activeTab === "team" ? <TeamOverview state={state} now={now} onVote={openVoting} /> : null}
        {activeTab === "reviews" && actor.role === "coach" ? <PlayerReviewWorkspace key={match.id} state={state} matchId={match.id} onCommand={run} /> : null}
        {activeTab === "coach" && actor.role === "coach" ? <CoachWorkspace state={state} matchId={match.id} onCommand={run} /> : null}
        {activeTab === "voting" ? <VotingPanel state={state} actor={actor} matchId={match.id} onCommand={run} now={now} /> : null}
        {activeTab === "observations" && (actor.role === "coach" || actor.role === "scout") ? <ObservationWorkspace key={actor.role} state={state} actor={actor} onCommand={run} now={now} /> : null}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-5 text-xs text-stone-400"><span>{profile.teamName} · {profile.roster ? "lokale kopie van teamgegevens" : profile.pilot ? "voorbeeldspelers" : "fictief demoteam"} · seizoen {profile.seasonLabel}</span><span className="flex items-center gap-1.5"><Heart size={12} /> Plezier. Aandacht. Samen groeien.</span></footer>
      </main>
      <nav aria-label="Teamportaal mobiel" className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-stone-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={activeTab === id ? "page" : undefined} onClick={() => changeTab(id)} className={`flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1.5 px-1 text-center text-[10px] font-semibold ${activeTab === id ? "text-dia-green" : "text-stone-500"}`}><span className={`rounded-full px-4 py-1 ${activeTab === id ? "bg-green-50" : ""}`}><Icon size={19} /></span>{actor.role === "coach" && id === "voting" ? "Waardering" : label}</button>)}</nav>
      {notice ? <div role={notice.error ? "alert" : "status"} className={`fixed bottom-24 left-4 right-4 z-30 mx-auto flex max-w-lg items-start gap-3 rounded-2xl border p-4 shadow-xl sm:bottom-6 ${notice.error ? "border-red-200 bg-red-50 text-red-900" : "border-green-200 bg-white text-dia-green"}`}>{notice.error ? <X className="mt-0.5 shrink-0" size={18} /> : <Check className="mt-0.5 shrink-0" size={18} />}<p className="flex-1 text-sm font-medium">{notice.text}</p><button type="button" aria-label="Melding sluiten" onClick={dismissNotice} className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-lg"><X size={16} /></button></div> : null}
    </div>
  );
}
