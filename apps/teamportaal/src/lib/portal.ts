import { makeFunctionReference } from "convex/server";

export type PlayerView = {
  id: string | null;
  name: string;
  position: string | null;
  number: number | null;
  canOpen: boolean;
  canDevelop: boolean;
};
export type MatchView = {
  id: string;
  opponent: string;
  isHome: boolean;
  scheduledAt: number | null;
  status: string;
  homeScore: number;
  awayScore: number;
  publicCode: string;
  venue: string | null;
};
export type Access = {
  signedIn: boolean;
  isCoach: boolean;
  isManager: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isParent: boolean;
  ownPlayerIds: string[];
};
export type Overview = {
  team: { id: string; name: string; slug: string };
  access: Access;
  players: PlayerView[];
  matches: MatchView[];
};
export type Feedback = { compliment: string; nextStep: string; report: string };
export type PlayerDetail = {
  profile: PlayerView;
  canDevelop: boolean;
  canEdit: boolean;
  canConsent: boolean;
  consent: { teamProfile: boolean; publicProfile: boolean } | null;
  published: { id: string; content: Feedback; at: number }[];
  draft: { content: Feedback; revision: number } | null;
};
export type MemberRole = "parent" | "player" | "team_manager";
export type Member = {
  id: string;
  label: string;
  accountKey: string;
  role: MemberRole;
  playerIds: string[];
  active: boolean;
};
export type TaskStatus = "pending" | "confirmed" | "change_requested" | "done";
export type Task = {
  id: string;
  matchId: string;
  title: string;
  assignee: string;
  mine: boolean;
  status: TaskStatus;
  response: string;
  revision: number;
};
export type Organization = {
  canManage: boolean;
  canAppointStaff: boolean;
  memberships: Member[];
  tasks: Task[];
};

// Portable client contract; Convex validates every argument, identity and projection.
export const portal = {
  standings: makeFunctionReference<
    "query",
    { teamSlug: string },
    {
      competitionName: string;
      fetchedAt: number;
      rows: {
        position: number;
        teamName: string;
        played: number;
        points: number;
      }[];
    } | null
  >("standings:getByTeamSlug"),
  overview: makeFunctionReference<"query", { slug: string }, Overview>(
    "teamPortal:overview",
  ),
  player: makeFunctionReference<
    "query",
    { slug: string; playerId: string },
    PlayerDetail
  >("teamPortal:player"),
  organization: makeFunctionReference<"query", { slug: string }, Organization>(
    "teamPortal:organization",
  ),
  setMembership: makeFunctionReference<
    "mutation",
    {
      slug: string;
      account: string;
      role: MemberRole;
      label: string;
      playerIds: string[];
      active: boolean;
      guardianApproved: boolean;
    },
    string
  >("teamPortalActions:setMembership"),
  setConsent: makeFunctionReference<
    "mutation",
    {
      slug: string;
      playerId: string;
      teamProfile: boolean;
      publicProfile: boolean;
    },
    null
  >("teamPortalActions:setConsent"),
  saveFeedback: makeFunctionReference<
    "mutation",
    {
      slug: string;
      playerId: string;
      content: Feedback;
      revision: number;
      action: "save" | "publish" | "withdraw";
    },
    number
  >("teamPortalActions:saveFeedback"),
  assignTask: makeFunctionReference<
    "mutation",
    {
      slug: string;
      taskId?: string;
      matchId: string;
      title: string;
      assigneeId: string;
      revision: number;
    },
    string
  >("teamPortalActions:assignTask"),
  respondToTask: makeFunctionReference<
    "mutation",
    {
      slug: string;
      taskId: string;
      revision: number;
      status: TaskStatus;
      response: string;
    },
    null
  >("teamPortalActions:respondToTask"),
};

export const panel =
  "rounded-2xl border border-white/20 bg-[#1c1d18] p-5 sm:p-6";
export const button =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#efc44b] px-4 py-3 text-sm font-bold text-black hover:bg-[#ffda70] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-50";
export const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-4 py-3 text-sm font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efc44b] disabled:opacity-50";
export const input =
  "mt-2 min-h-12 w-full rounded-xl border border-white/40 bg-[#10110f] px-3 py-2 text-base text-white focus:outline-2 focus:outline-[#efc44b]";
export const matchLabel = (m: MatchView, name = "DIA JO13-2") =>
  m.isHome ? `${name} – ${m.opponent}` : `${m.opponent} – ${name}`;
export const dateLabel = (at: number | null) =>
  at === null
    ? "Tijdstip volgt"
    : new Intl.DateTimeFormat("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Amsterdam",
      }).format(at);
