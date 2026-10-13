"use client";

import { useQuery } from "convex/react";
import { button, portal, type MatchView } from "@/lib/portal";
import { liveAppOrigin, teamMatchesUrl } from "@/lib/team";
import { PortalSession } from "./PortalSession";

export function MatchLink({
  match,
  isCoach,
}: {
  match: Pick<MatchView, "id" | "publicCode">;
  isCoach: boolean;
}) {
  const path = isCoach
    ? `/coach/match/${encodeURIComponent(match.id)}`
    : `/live/${encodeURIComponent(match.publicCode)}`;
  return (
    <a className={button} href={`${liveAppOrigin}${path}`}>
      Open wedstrijd ↗
    </a>
  );
}

export function ReportMatchLink({ slug, matchId }: { slug: string; matchId: string }) {
  return (
    <PortalSession>
      <ConnectedMatchLink slug={slug} matchId={matchId} />
    </PortalSession>
  );
}

function ConnectedMatchLink({ slug, matchId }: { slug: string; matchId: string }) {
  const data = useQuery(portal.overview, { slug });
  if (!data) return <span role="status" className="text-sm text-stone-400">Wedstrijd laden…</span>;
  const match = data.matches.find((item) => item.id === matchId);
  if (!match) return <a className={button} href={teamMatchesUrl}>Alle wedstrijden ↗</a>;
  return <MatchLink match={match} isCoach={data.access.isCoach} />;
}
