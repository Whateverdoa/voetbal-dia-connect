"use client";

import { ArrowUpRight, CalendarDays, Check, ChevronRight, Heart, Medal, MessageCircle, Sparkles, Target, Trophy } from "lucide-react";
import { canReadPlayer, getPlayerBadges, getPublishedFeedback } from "@/lib/team-portal/selectors";
import { SKILLS, type DemoActor, type DemoState, type Skill, type SkillLevel } from "@/lib/team-portal/types";
import { PublishedPlayerReviews } from "./PublishedPlayerReviews";
import { DemoPlayerCard } from "./DemoPlayerCard";
import { useDemoProfile } from "./DemoProfileContext";

interface MemberOverviewProps {
  state: DemoState;
  actor: DemoActor;
  playerId: string;
  now: number;
  onVote: () => void;
  view?: "profile" | "development";
}

const skillLabels: Record<Skill, string> = {
  balvaardigheid: "Balvaardigheid", spelinzicht: "Spelinzicht", samenspel: "Samenspel", inzet: "Inzet", sportiviteit: "Sportiviteit",
};
const levelStyle: Record<SkillLevel, string> = {
  "Nog niet beoordeeld": "bg-stone-100 text-stone-500",
  "In ontwikkeling": "bg-sky-50 text-sky-800",
  "Steeds vaker zichtbaar": "bg-teal-50 text-teal-800",
  "Sterk punt": "bg-emerald-50 text-emerald-800",
};
const panelClass = "rounded-3xl border border-stone-200 bg-white p-5 sm:p-6";

export function MemberOverview({ state, actor, playerId, now, onVote, view = "profile" }: MemberOverviewProps) {
  const profile = useDemoProfile();
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || !canReadPlayer(state, actor, playerId)) {
    return <div className={panelClass}><p className="font-bold text-stone-800">Dit profiel is niet beschikbaar.</p><p className="mt-2 text-sm text-stone-500">Kies je eigen spelersprofiel of een gekoppeld kind.</p></div>;
  }

  const feedback = getPublishedFeedback(state, actor, playerId);
  const latest = feedback[0];
  const badges = getPlayerBadges(state, playerId, now);
  const moments = state.highlights.filter((highlight) => highlight.playerId === playerId && highlight.status === "approved");
  const isParent = actor.role === "parent";
  const lastMatch = state.matches[0];

  if (view === "development") {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 sm:p-7">
          <Target aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-dia-green" />
          <div><h2 className="text-2xl font-black tracking-tight text-stone-900">Elke week een beetje verder</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">Hier lees je wat je coach ziet en waar je mee kunt oefenen. Jouw eigen stappen, in jouw tempo.</p></div>
        </div>
        <PublishedPlayerReviews state={state} actor={actor} playerId={playerId} />
        <FeedbackHistory state={state} feedback={feedback} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <DemoPlayerCard player={player} />
        <div className="min-w-0 space-y-5">
          <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-[#edf4e7] p-5 sm:p-7" aria-labelledby="member-next-step">
            <Target aria-hidden="true" className="absolute -right-5 -top-5 h-36 w-36 text-emerald-900/[0.035]" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-dia-green"><Target aria-hidden="true" className="h-4 w-4" />Klaar voor de volgende stap</span>
              <h2 id="member-next-step" className="mt-3 text-xl font-black tracking-tight text-stone-900">{isParent ? `Volgende stap voor ${player.name}` : "Jouw uitdaging voor de training"}</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-base font-medium leading-relaxed text-emerald-950">{latest?.content.nextStep ?? "Samen met je coach kies je binnenkort een eerste oefendoel."}</p>
              <p className="mt-4 text-xs text-emerald-800">Een kleine stap. Gewoon proberen.</p>
            </div>
          </section>

          <section className={panelClass} aria-labelledby="member-compliment">
            <div className="flex items-center gap-2 text-dia-green"><MessageCircle aria-hidden="true" className="h-5 w-5" /><h2 id="member-compliment" className="text-sm font-bold">Een compliment van de coach</h2></div>
            {latest ? (
              <><blockquote className="mt-4 whitespace-pre-wrap break-words text-lg font-semibold leading-relaxed text-stone-800">“{latest.content.compliment}”</blockquote><p className="mt-3 text-xs text-stone-500">{feedbackSource(state, latest)} · {feedbackDate(latest.publishedAt)}</p></>
            ) : <p className="mt-3 text-sm leading-relaxed text-stone-500">De coach heeft nog geen feedback gedeeld. Zodra die er is, verschijnt die hier.</p>}
          </section>

          <section className={panelClass} aria-labelledby="member-badges">
            <div className="flex items-center gap-2"><Medal aria-hidden="true" className="h-5 w-5 text-amber-600" /><h2 id="member-badges" className="font-bold text-stone-900">Momenten om te bewaren</h2></div>
            {badges.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{badges.map((badge) => (
              <div key={badge.id} className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <span className="rounded-full bg-amber-100 p-2.5"><Trophy aria-hidden="true" className="h-5 w-5 text-amber-700" /></span>
                <div><p className="text-sm font-bold leading-snug text-amber-950">{badge.label}</p><p className="mt-1 text-xs text-amber-800">Tegen {badge.opponent}</p></div>
              </div>
            ))}</div> : <p className="mt-3 text-sm leading-relaxed text-stone-500">Hier komen de wedstrijdbadges die het team aan {isParent ? player.name : "jou"} geeft. Elke bijdrage aan het team is waardevol.</p>}
          </section>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className={panelClass} aria-labelledby="next-fixture">
          <div className="flex items-center gap-2 text-dia-green"><CalendarDays aria-hidden="true" className="h-5 w-5" /><h2 id="next-fixture" className="text-sm font-bold">Weer samen het veld op</h2></div>
          <div className="mt-4 flex items-center gap-4">
            <div className="rounded-2xl bg-stone-100 px-4 py-3 text-center"><p className="text-xs font-bold uppercase text-stone-500">Sep</p><p className="text-3xl font-black text-stone-900">26</p></div>
            <div><p className="font-bold text-stone-900">{profile.teamName} – Parkstad JO13</p><p className="mt-1 text-sm text-stone-500">Zaterdag · 10:30 uur</p><p className="mt-1 text-xs text-stone-400">Oefenwedstrijd · fictief programma</p></div>
          </div>
        </section>
        <section className={panelClass} aria-labelledby="last-fixture">
          <div className="flex items-center gap-2 text-dia-green"><Check aria-hidden="true" className="h-5 w-5" /><h2 id="last-fixture" className="text-sm font-bold">Laatste wedstrijd</h2></div>
          {lastMatch ? <div className="mt-5 flex items-center justify-between gap-4"><div><p className="font-bold text-stone-900">{profile.teamName} – {lastMatch.opponent}</p><p className="mt-2 text-sm text-stone-500">{lastMatch.dateLabel}</p></div><p className="shrink-0 rounded-xl bg-stone-100 px-4 py-3 text-2xl font-black tracking-tight text-stone-900">{lastMatch.score}</p></div> : <p className="mt-4 text-sm text-stone-500">Er is nog geen wedstrijd gespeeld.</p>}
        </section>
      </div>

      <section className={panelClass} aria-labelledby="member-moments">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Sparkles aria-hidden="true" className="h-5 w-5 text-dia-green" /><h2 id="member-moments" className="text-lg font-black text-stone-900">{isParent ? `${player.name} in de wedstrijd` : "Dat deed jij mooi"}</h2></div>
          {!isParent ? <button type="button" onClick={onVote} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-dia-green hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green">Geef een teamgenoot een stem <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></button> : null}
        </div>
        {moments.length > 0 ? <div className="mt-5 grid gap-3 md:grid-cols-2">{moments.map((moment) => (
          <article key={moment.id} className="rounded-2xl bg-stone-50 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-dia-green"><Heart aria-hidden="true" className="h-3.5 w-3.5" />{moment.category}{moment.minute !== undefined ? ` · ${moment.minute}e minuut` : ""}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">{moment.description}</p>
            <p className="mt-3 text-xs text-stone-400">Tegen {state.matches.find((match) => match.id === moment.matchId)?.opponent ?? "een ander team"}</p>
          </article>
        ))}</div> : <p className="mt-3 text-sm leading-relaxed text-stone-500">Er zijn nog geen wedstrijdmomenten gedeeld voor {player.name}. Ook een mooie pass of een teamgenoot helpen verdient een plekje.</p>}
      </section>

      <PublishedPlayerReviews state={state} actor={actor} playerId={playerId} />
      {isParent ? <FeedbackHistory state={state} feedback={feedback} /> : null}
    </div>
  );
}

type PublishedFeedback = ReturnType<typeof getPublishedFeedback>[number];

function feedbackDate(timestamp: number) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", timeZone: "Europe/Amsterdam" }).format(timestamp);
}

function feedbackSource(state: DemoState, feedback: PublishedFeedback) {
  return feedback.kind === "periodic" ? "Ontwikkelgesprek" : `Wedstrijd tegen ${state.matches.find((match) => match.id === feedback.matchId)?.opponent ?? "de tegenstander"}`;
}

function FeedbackHistory({ state, feedback }: { state: DemoState; feedback: PublishedFeedback[] }) {
  return (
    <section className={panelClass} aria-labelledby="feedback-history">
      <div className="flex items-center gap-2"><MessageCircle aria-hidden="true" className="h-5 w-5 text-dia-green" /><h2 id="feedback-history" className="text-xl font-black tracking-tight text-stone-900">Ontwikkeling en coachfeedback</h2></div>
      <p className="mt-2 text-sm text-stone-500">Persoonlijk gedeeld met de speler en de gekoppelde ouders.</p>
      {feedback.length === 0 ? <div className="mt-5 rounded-2xl bg-stone-50 p-5 text-sm leading-relaxed text-stone-500">Er is nog geen feedback gepubliceerd. De coach deelt hier straks een compliment en een volgend oefenpunt.</div> : (
        <div className="mt-6 space-y-6">
          {feedback.map((entry) => (
            <article key={entry.id} className="relative border-l-2 border-emerald-100 pl-5 sm:pl-7">
              <span aria-hidden="true" className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-dia-green" />
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-stone-900">{feedbackSource(state, entry)}</h3><p className="text-xs text-stone-500">{feedbackDate(entry.publishedAt)}</p></div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">{entry.content.compliment}</p>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-950"><ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p className="whitespace-pre-wrap break-words"><span className="font-bold">Volgende stap: </span>{entry.content.nextStep}</p></div>
              {entry.kind === "periodic" ? <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{SKILLS.map((skill) => (
                <div key={skill} className="rounded-xl border border-stone-100 p-3"><dt className="text-xs font-medium text-stone-500">{skillLabels[skill]}</dt><dd className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${levelStyle[entry.content.skills[skill]]}`}>{entry.content.skills[skill] === "Sterk punt" ? <Sparkles aria-hidden="true" className="h-3 w-3" /> : null}{entry.content.skills[skill]}</dd></div>
              ))}</dl> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
