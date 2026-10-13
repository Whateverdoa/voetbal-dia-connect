"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  portal,
  panel,
  secondary,
  dateLabel,
  matchLabel,
  type Overview,
  type PlayerView,
} from "@/lib/portal";
import { liveAppOrigin } from "@/lib/team";
import { publicMatches } from "@/lib/match-reports";
import { PortalSession } from "./PortalSession";
import { ShieldCard } from "./cards/ShieldCard";
import { FootballShieldContent } from "./cards/FootballShieldContent";
import { PlayerPage } from "./PlayerPage";
import { OrganizationPage } from "./OrganizationPage";
import { MatchLink } from "./MatchLink";

type View =
  | "team"
  | "start"
  | "coaching"
  | "organisatie"
  | "player"
  | "matches";
export function ConnectedPortal({
  slug = "jo13-2",
  view = "team",
  playerId,
}: {
  slug?: string;
  view?: View;
  playerId?: string;
}) {
  return (
    <main
      id="inhoud"
      className="mx-auto min-h-[65vh] max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-10"
    >
      <PortalSession>
        <PortalContent slug={slug} view={view} playerId={playerId} />
      </PortalSession>
    </main>
  );
}

export function PlayerShield({ player }: { player: PlayerView }) {
  return (
    <ShieldCard
      theme="gold"
      series="abstract"
      contentLayout="football"
      label={`Spelersschild van ${player.name}`}
    >
      <FootballShieldContent
        name={player.name}
        position={player.position ?? undefined}
      />
    </ShieldCard>
  );
}
function PlayerGrid({
  data,
  developmentOnly = false,
}: {
  data: Overview;
  developmentOnly?: boolean;
}) {
  const players = developmentOnly
    ? data.players.filter((p) => p.canDevelop && p.id)
    : data.players;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
      {players.map((p, i) => (
        <div key={p.id ?? `hidden-${i}`} className="min-w-0">
          {p.canOpen && p.id ? (
            <Link
              href={`/team/${data.team.slug}/speler/${p.id}`}
              className="block rounded-2xl transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efc44b]"
            >
              <PlayerShield player={p} />
              <span className="block pb-2 text-center text-sm font-bold">
                {p.name}
              </span>
            </Link>
          ) : (
            <div>
              <PlayerShield player={p} />
              <p className="pb-2 text-center text-sm text-stone-300">
                {p.name}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
function MatchList({ data, limit }: { data: Overview; limit?: number }) {
  const matches = limit ? data.matches.slice(0, limit) : data.matches;
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Programma en uitslagen</h2>
        {limit ? (
          <Link
            href={`/team/${data.team.slug}/wedstrijden`}
            className="inline-flex min-h-11 items-center text-sm font-bold text-[#efc44b]"
          >
            Alle wedstrijden →
          </Link>
        ) : null}
      </div>
      <div className="mt-4 divide-y divide-white/15">
        {matches.map((m) => (
          <article
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-4 py-4"
          >
            <div>
              <p className="text-xs text-stone-400">
                {dateLabel(m.scheduledAt)}
                {m.venue ? ` · ${m.venue}` : ""}
              </p>
              <h3 className="mt-1 font-bold">
                {matchLabel(m, data.team.name)}
              </h3>
              <p className="mt-1 text-sm text-[#efc44b]">
                {m.status === "finished"
                  ? "Gespeeld"
                  : m.status === "setup"
                    ? "Nog te spelen"
                    : "Wedstrijd bezig"}{" "}
                · {m.homeScore} – {m.awayScore}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {m.status === "finished" && data.team.slug === "jo13-2" && publicMatches.some((report) => report.id === m.id) ? (
                <Link
                  className={secondary}
                  href={`/team/${data.team.slug}/verslagen/${m.id}`}
                >
                  Verslag
                </Link>
              ) : null}
              <MatchLink match={m} isCoach={data.access.isCoach} />
            </div>
          </article>
        ))}
        {!matches.length ? (
          <p className="py-4 text-stone-300">
            Er staan nog geen wedstrijden klaar.
          </p>
        ) : null}
      </div>
    </section>
  );
}
function Standings({ slug }: { slug: string }) {
  const standings = useQuery(portal.standings, { teamSlug: slug });
  return (
    <section className={panel}>
      <h2 className="text-xl font-bold">Ons teamseizoen</h2>
      <p className="mt-2 text-sm text-stone-400">
        {standings?.competitionName ?? "Competitiestand"}
      </p>
      {standings?.rows.length ? (
        <>
          <table className="mt-4 w-full text-left text-sm">
            <caption className="sr-only">Competitiestand</caption>
            <thead>
              <tr className="border-b border-white/25">
                <th className="py-3 pr-2">Pos.</th>
                <th>Team</th>
                <th className="px-2 text-right">G</th>
                <th className="text-right">P</th>
              </tr>
            </thead>
            <tbody>
              {standings.rows.map((row) => (
                <tr
                  key={`${row.position}-${row.teamName}`}
                  className="border-b border-white/10"
                >
                  <td className="py-3 pr-2">{row.position}</td>
                  <th className="py-3 font-medium">{row.teamName}</th>
                  <td className="px-2 text-right tabular-nums">{row.played}</td>
                  <td className="text-right font-bold tabular-nums">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-stone-400">
            Bijgewerkt {dateLabel(standings.fetchedAt)}
          </p>
        </>
      ) : (
        <p className="mt-4 text-stone-300">De stand is nog niet beschikbaar.</p>
      )}
    </section>
  );
}
function PortalContent({
  slug,
  view,
  playerId,
}: {
  slug: string;
  view: View;
  playerId?: string;
}) {
  const data = useQuery(portal.overview, { slug });
  const router = useRouter();
  useEffect(() => {
    if (view !== "start" || !data) return;
    const a = data.access;
    if (!a.signedIn) router.replace("/sign-in");
    else if (a.ownPlayerIds.length === 1)
      router.replace(`/team/${slug}/speler/${a.ownPlayerIds[0]}`);
    else if (!a.ownPlayerIds.length && (a.isManager || a.isAdmin))
      router.replace(`/team/${slug}/organisatie`);
    else if (!a.ownPlayerIds.length && a.isCoach)
      router.replace(`/team/${slug}/coaching`);
  }, [data, view, slug, router]);
  if (!data) return <p role="status">Het team wordt opgehaald…</p>;
  const a = data.access;
  const base = `/team/${slug}`;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#efc44b]">
            Ons team · seizoen 2026–2027
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            {data.team.name}
          </h1>
        </div>
        <p className="text-xs text-stone-400">
          {a.isMember ? "Besloten teamomgeving" : "Openbare teampagina"}
        </p>
      </div>
      <nav aria-label="Mijn teamonderdelen" className="flex flex-wrap gap-2">
        <Link className={secondary} href={base}>
          Team
        </Link>
        <Link className={secondary} href={`${base}/wedstrijden`}>
          Wedstrijden
        </Link>
        {a.ownPlayerIds.length > 0 ? (
          <Link className={secondary} href="/start">
            Speler
          </Link>
        ) : null}
        {a.isCoach ? (
          <Link className={secondary} href={`${base}/coaching`}>
            Coachwerkplek
          </Link>
        ) : null}
        {a.isCoach || a.isManager || a.isAdmin || a.isParent ? (
          <Link className={secondary} href={`${base}/organisatie`}>
            {a.isCoach || a.isManager || a.isAdmin
              ? "Teammanager"
              : "Wedstrijdtaken"}
          </Link>
        ) : null}
      </nav>
      {view === "team" ? (
        <>
          <section aria-label="Spelers van het team">
            <PlayerGrid data={data} />
            <p className="mt-3 text-xs text-stone-400">
              Iedereen hoort erbij. Een voornaam wordt gedeeld na toestemming;
              foto’s worden hier nog niet getoond.
            </p>
          </section>
          <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
            <MatchList data={data} limit={3} />
            <Standings slug={slug} />
          </div>
        </>
      ) : null}
      {view === "matches" ? <MatchList data={data} /> : null}
      {view === "player" && playerId ? (
        <PlayerPage key={playerId} slug={slug} playerId={playerId} />
      ) : null}
      {view === "start" ? (
        <section className={panel}>
          <h2 className="text-xl font-bold">Speler</h2>
          {a.ownPlayerIds.length ? (
            <>
              <p className="my-4">
                Kies de speler van wie je de ontwikkeling wilt bekijken.
              </p>
              <PlayerGrid data={data} developmentOnly />
            </>
          ) : (
            <p className="mt-4">
              Je account is nog niet aan een speler gekoppeld. Vraag de coach of
              teammanager de ouder-kindkoppeling te controleren. Je kunt het
              team en de openbare verslagen al bekijken.
            </p>
          )}
        </section>
      ) : null}
      {view === "coaching" ? (
        a.isCoach ? (
          <>
            <section className={panel}>
              <h2 className="text-xl font-bold">Coachwerkplek</h2>
              <p className="mt-3 text-stone-300">
                Kies een speler voor je compliment, volgende oefenpunt en
                persoonlijk verslag. Bewaar eerst een eigen concept en publiceer
                het wanneer het gezin het mag lezen.
              </p>
              <div className="mt-5">
                <PlayerGrid data={data} developmentOnly />
              </div>
            </section>
            <MatchList data={data} limit={3} />
          </>
        ) : (
          <Restricted />
        )
      ) : null}
      {view === "organisatie" ? (
        a.isCoach || a.isManager || a.isAdmin || a.isParent ? (
          <OrganizationPage data={data} />
        ) : (
          <Restricted />
        )
      ) : null}
      <footer className="border-t border-white/15 pt-5 text-xs text-stone-400">
        Verbonden met DIA Live · team en wedstrijden worden automatisch
        bijgewerkt.{" "}
        <a
          className="inline-flex min-h-11 items-center text-[#efc44b]"
          href={`${liveAppOrigin}/team/${slug}`}
        >
          Naar DIA Live →
        </a>
      </footer>
    </>
  );
}
function Restricted() {
  return (
    <section className={panel}>
      <h2 className="text-xl font-bold">Dit onderdeel is afgeschermd</h2>
      <p className="mt-3">
        Je account heeft geen toegang tot dit onderdeel van het team.
      </p>
    </section>
  );
}
