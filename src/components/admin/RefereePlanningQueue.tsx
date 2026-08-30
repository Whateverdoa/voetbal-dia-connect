"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { activeSeasonKey } from "@/lib/season";
import type { AssignmentBoardMatch } from "./types";

type PlannerNeed = FunctionReturnType<
  typeof api.refereeAssignmentQueries.listPlannerQueue
>[number];
type RefereeProfile = FunctionReturnType<
  typeof api.refereeDomain.listPlannerRefereeProfiles
>[number];

const NEED_STATUS = {
  open: { label: "Open", className: "border-sky-200 bg-sky-50 text-sky-800" },
  matching: {
    label: "Kandidaten zoeken",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  awaiting_response: {
    label: "Wacht op reactie",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  awaiting_confirmation: {
    label: "Bevestiging nodig",
    className: "border-violet-200 bg-violet-50 text-violet-900",
  },
  assigned: {
    label: "Toegewezen",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  cancelled: {
    label: "Geannuleerd",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  completed: {
    label: "Afgerond",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
} as const;

const OFFER_STATUS: Record<string, string> = {
  pending: "Offer verstuurd",
  accepted: "Geaccepteerd",
  declined: "Afgewezen",
  expired: "Verlopen",
  withdrawn: "Ingetrokken",
};

const ELIGIBILITY_LABELS: Record<string, string> = {
  PROFILE_INACTIVE: "Profiel is niet actief",
  PROFILE_WRONG_CLUB: "Profiel hoort bij een andere club",
  CLUB_BLOCKED: "Club is door scheidsrechter geblokkeerd",
  TEAM_BLOCKED: "Team is door scheidsrechter geblokkeerd",
  AGE_GROUP_NOT_ALLOWED: "Leeftijdsgroep valt buiten bevoegdheid",
  MATCH_LEVEL_NOT_ALLOWED: "Wedstrijdniveau valt buiten bevoegdheid",
  QUALIFICATION_MISMATCH: "Vereiste kwalificatie ontbreekt",
  MATCH_TIME_MISSING: "Wedstrijdtijd is niet compleet",
  REFEREE_UNAVAILABLE: "Scheidsrechter staat als niet beschikbaar",
  REFEREE_CONFLICT: "Overlap met een bevestigde wedstrijd",
};

const AUDIT_LABELS: Record<string, string> = {
  need_created: "Aanvraag aangemaakt",
  offer_sent: "Offer verstuurd",
  offer_accepted: "Offer geaccepteerd",
  offer_declined: "Offer afgewezen",
  offer_expired: "Offer verlopen",
  offer_withdrawn: "Offer ingetrokken",
  assignment_confirmed: "Toewijzing bevestigd",
  assignment_cancelled: "Toewijzing geannuleerd",
};

function createCorrelationId(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

function formatDateTime(value: number | null | undefined) {
  if (!value) return "Nog niet gepland";
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function actionError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const known: Array<[string, string]> = [
    ["VERSION_CONFLICT", "De gegevens zijn intussen gewijzigd. Probeer opnieuw."],
    ["ACTIVE_OFFER_EXISTS", "Er staat al een actief offer voor deze wedstrijd."],
    ["REFEREE_CONFLICT", "Deze scheidsrechter heeft een harde beschikbaarheidsconflict."],
    ["REFEREE_NOT_ELIGIBLE", "Deze scheidsrechter voldoet niet aan de eisen."],
    ["REFEREE_ACCOUNT_REQUIRED", "Deze scheidsrechter heeft nog geen gekoppeld account."],
    ["INVALID_TRANSITION", "Deze actie past niet meer bij de actuele status."],
    ["FORBIDDEN", "Je hebt geen toestemming voor deze actie."],
    ["VALIDATION_ERROR", "Controleer de ingevoerde gegevens en deadlines."],
  ];
  return known.find(([code]) => raw.includes(code))?.[1] ?? raw;
}

function StatusBadge({ status }: { status: PlannerNeed["status"] }) {
  const config = NEED_STATUS[status];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l-2 border-dia-green px-3 py-1">
      <div className="text-xl font-semibold tabular-nums text-slate-950">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function PlannerActivation({ clubId }: { clubId: Id<"clubs"> }) {
  const syncCurrentAccount = useMutation(api.clubIdentity.syncCurrentAccount);
  const bootstrapMembership = useMutation(
    api.clubIdentity.bootstrapLegacyAdminMembership
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function activate() {
    setBusy(true);
    setMessage("");
    try {
      await syncCurrentAccount({});
      await bootstrapMembership({
        clubId,
        correlationId: createCorrelationId("planner-bootstrap"),
      });
      setMessage("Plannerrol geactiveerd.");
    } catch (error) {
      setMessage(actionError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 text-amber-800" size={20} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-950">Planneromgeving activeren</h3>
          <p className="mt-1 text-sm text-slate-700">
            Koppel je bestaande adminaccount eenmalig aan de nieuwe clubrollen.
          </p>
          <button
            type="button"
            onClick={activate}
            disabled={busy}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
          >
            <UserRoundCheck size={17} />
            {busy ? "Activeren..." : "Planner activeren"}
          </button>
          {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
        </div>
      </div>
    </section>
  );
}

function NeedCreator({
  clubId,
  queue,
  matches,
  onMessage,
}: {
  clubId: Id<"clubs">;
  queue: PlannerNeed[];
  matches: AssignmentBoardMatch[];
  onMessage: (message: string) => void;
}) {
  const createNeed = useMutation(api.refereeAssignmentCommands.createNeed);
  const [matchId, setMatchId] = useState("");
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const existingMatchIds = new Set(queue.map((need) => String(need.match.matchId)));
  const options = matches
    .filter(
      (match) =>
        match.clubId === String(clubId) &&
        !match.refereeId &&
        !existingMatchIds.has(String(match._id)) &&
        match.scheduledAt !== undefined &&
        match.scheduledAt > now + 2 * 60 * 60 * 1000 &&
        match.status === "scheduled"
    )
    .sort((left, right) => (left.scheduledAt ?? 0) - (right.scheduledAt ?? 0));

  async function submit() {
    const match = options.find((option) => String(option._id) === matchId);
    if (!match?.scheduledAt) return;
    setBusy(true);
    try {
      await createNeed({
        matchId: match._id,
        arrivalAt: match.scheduledAt - 30 * 60 * 1000,
        expectedEndAt: match.scheduledAt + 2 * 60 * 60 * 1000,
        responseDeadline: Math.min(
          Date.now() + 24 * 60 * 60 * 1000,
          match.scheduledAt - 2 * 60 * 60 * 1000
        ),
        assignmentDeadline: match.scheduledAt - 60 * 60 * 1000,
        correlationId: createCorrelationId("need"),
      });
      setMatchId("");
      onMessage("Scheidsrechteraanvraag aangemaakt.");
    } catch (error) {
      onMessage(actionError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(16rem,1fr)_auto] md:items-end">
      <label className="text-sm font-medium text-slate-700">
        Nieuwe aanvraag voor wedstrijd
        <select
          value={matchId}
          onChange={(event) => setMatchId(event.target.value)}
          className="mt-1.5 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950"
        >
          <option value="">Selecteer een wedstrijd</option>
          {options.map((match) => (
            <option key={match._id} value={String(match._id)}>
              {formatDateTime(match.scheduledAt)} - {match.teamName} tegen {match.opponent}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!matchId || busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-dia-green px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={17} />
        {busy ? "Aanmaken..." : "Aanvraag maken"}
      </button>
      {options.length === 0 && (
        <p className="text-xs text-slate-500 md:col-span-2">
          Geen komende wedstrijden zonder aanvraag beschikbaar.
        </p>
      )}
    </div>
  );
}

function OfferComposer({
  need,
  profiles,
  onMessage,
}: {
  need: PlannerNeed;
  profiles: RefereeProfile[];
  onMessage: (message: string) => void;
}) {
  const sendOffer = useMutation(api.refereeAssignmentCommands.sendOffer);
  const [profileId, setProfileId] = useState("");
  const [busy, setBusy] = useState(false);
  const linkedProfiles = profiles.filter(
    (profile) => profile.status === "active" && profile.userId !== null
  );
  const eligibility = useQuery(
    api.refereeAssignmentQueries.getPlannerCandidateEligibility,
    profileId
      ? {
          needId: need.needId,
          refereeProfileId: profileId as Id<"refereeProfiles">,
        }
      : "skip"
  );

  async function submit() {
    if (!profileId || !eligibility?.eligible) return;
    const expiresAt = Math.min(
      Date.now() + 24 * 60 * 60 * 1000,
      need.responseDeadline ?? Number.POSITIVE_INFINITY
    );
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      onMessage("De reactietermijn is verstreken. Maak een nieuwe aanvraag.");
      return;
    }
    setBusy(true);
    try {
      await sendOffer({
        needId: need.needId,
        refereeProfileId: profileId as Id<"refereeProfiles">,
        expiresAt,
        needVersion: need.version,
        correlationId: createCorrelationId("offer"),
      });
      setProfileId("");
      onMessage("Offer verstuurd.");
    } catch (error) {
      onMessage(actionError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(12rem,1fr)_auto] lg:items-end">
        <label className="text-sm font-medium text-slate-700">
          Scheidsrechter
          <select
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
            className="mt-1.5 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950"
          >
            <option value="">Selecteer uit de pool</option>
            {linkedProfiles.map((profile) => (
              <option key={profile.profileId} value={String(profile.profileId)}>
                {profile.displayName}
                {profile.qualificationLevel
                  ? ` - ${profile.qualificationLevel}`
                  : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="min-h-11 text-sm">
          {!profileId && (
            <p className="text-slate-500">Kies een kandidaat voor de conflictcontrole.</p>
          )}
          {profileId && eligibility === undefined && (
            <p className="text-slate-500">Beschikbaarheid controleren...</p>
          )}
          {eligibility?.eligible && (
            <p className="inline-flex items-center gap-2 font-medium text-emerald-700">
              <Check size={16} /> Inzetbaar voor dit tijdvak
            </p>
          )}
          {eligibility && !eligibility.eligible && (
            <div className="text-rose-700">
              {eligibility.codes.map((code) => (
                <p key={code}>{ELIGIBILITY_LABELS[code] ?? code}</p>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!eligibility?.eligible || busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send size={16} />
          {busy ? "Versturen..." : "Offer sturen"}
        </button>
      </div>
      {linkedProfiles.length === 0 && (
        <p className="mt-2 text-xs text-amber-800">
          Er zijn nog geen actieve scheidsrechters met een gekoppeld account.
        </p>
      )}
    </div>
  );
}

function ConfirmationAction({
  need,
  onMessage,
}: {
  need: PlannerNeed;
  onMessage: (message: string) => void;
}) {
  const confirmAssignment = useMutation(
    api.refereeAssignmentCommands.confirmAssignment
  );
  const [busy, setBusy] = useState(false);
  const accepted = need.offers.find((offer) => offer.status === "accepted");
  if (!accepted) return null;

  async function confirm() {
    setBusy(true);
    try {
      await confirmAssignment({
        acceptedOfferId: accepted!.offerId,
        offerVersion: accepted!.version,
        needVersion: need.version,
        correlationId: createCorrelationId("confirm"),
      });
      onMessage(`${accepted!.refereeName} is als scheidsrechter bevestigd.`);
    } catch (error) {
      onMessage(actionError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-violet-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-violet-950">
          {accepted.refereeName} heeft het offer geaccepteerd
        </p>
        <p className="text-xs text-violet-700">
          Er is nog geen definitieve toewijzing gemaakt.
        </p>
      </div>
      <button
        type="button"
        onClick={confirm}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <ShieldCheck size={17} />
        {busy ? "Bevestigen..." : "Toewijzing bevestigen"}
      </button>
    </div>
  );
}

function CancellationAction({
  need,
  onMessage,
}: {
  need: PlannerNeed;
  onMessage: (message: string) => void;
}) {
  const cancelAssignment = useMutation(
    api.refereeAssignmentCommands.cancelAssignment
  );
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reopenNeed, setReopenNeed] = useState(true);
  const [busy, setBusy] = useState(false);
  const assignment = need.assignment;
  if (!assignment || assignment.status !== "confirmed") return null;

  async function cancel() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await cancelAssignment({
        assignmentId: assignment!.assignmentId,
        assignmentVersion: assignment!.version,
        reason: reason.trim(),
        reopenNeed,
        correlationId: createCorrelationId("cancel"),
      });
      setReason("");
      setOpen(false);
      onMessage(
        reopenNeed
          ? "Toewijzing geannuleerd; de aanvraag staat opnieuw open."
          : "Toewijzing en aanvraag geannuleerd."
      );
    } catch (error) {
      onMessage(actionError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <RotateCcw size={15} /> Vervangen of annuleren
        </button>
      ) : (
        <div className="grid gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 md:grid-cols-[minmax(14rem,1fr)_auto] md:items-end">
          <label className="text-sm font-medium text-slate-800">
            Reden
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Bijvoorbeeld: scheidsrechter verhinderd"
              className="mt-1.5 block min-h-11 w-full rounded-md border border-rose-200 bg-white px-3 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="mr-2 inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={reopenNeed}
                onChange={(event) => setReopenNeed(event.target.checked)}
              />
              Opnieuw openzetten
            </label>
            <button
              type="button"
              onClick={cancel}
              disabled={!reason.trim() || busy}
              className="min-h-11 rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Verwerken..." : "Bevestigen"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditTrail({ needId }: { needId: Id<"matchRefereeNeeds"> }) {
  const [open, setOpen] = useState(false);
  const events = useQuery(
    api.refereeAssignmentQueries.listNeedAudit,
    open ? { needId } : "skip"
  );

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        aria-expanded={open}
      >
        <History size={15} /> Auditgeschiedenis
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="mt-2 border-l-2 border-slate-200 pl-4">
          {events === undefined ? (
            <p className="py-2 text-sm text-slate-500">Geschiedenis laden...</p>
          ) : events.length === 0 ? (
            <p className="py-2 text-sm text-slate-500">Nog geen auditregels.</p>
          ) : (
            <ol className="space-y-3 py-2">
              {events.map((event) => (
                <li key={event.auditId} className="text-sm">
                  <p className="font-medium text-slate-800">
                    {AUDIT_LABELS[event.eventType] ?? event.eventType}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(event.createdAt)} · {event.actorType}
                    {event.reasonCode ? ` · ${event.reasonCode}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function NeedRow({
  need,
  profiles,
  onMessage,
}: {
  need: PlannerNeed;
  profiles: RefereeProfile[];
  onMessage: (message: string) => void;
}) {
  const latestOffer = [...need.offers].sort(
    (left, right) => right.sentAt - left.sentAt
  )[0];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(15rem,1.4fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={need.status} />
            <span className="text-xs text-slate-500">versie {need.version}</span>
          </div>
          <h3 className="mt-2 font-semibold text-slate-950">
            {need.match.teamName} tegen {need.match.opponent}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {need.match.isHome ? "Thuis" : "Uit"} · {formatDateTime(need.match.scheduledAt)}
          </p>
        </div>

        <div className="text-sm text-slate-600">
          <p className="flex items-center gap-2">
            <Clock3 size={15} /> Aankomst {formatDateTime(need.arrivalAt)}
          </p>
          {need.requiredQualification && (
            <p className="mt-2">Kwalificatie: {need.requiredQualification}</p>
          )}
          {need.venue && <p className="mt-1">Locatie: {need.venue}</p>}
        </div>

        <div className="text-sm">
          {need.assignment?.status === "confirmed" ? (
            <div className="flex items-start gap-2 text-emerald-800">
              <ShieldCheck className="mt-0.5" size={17} />
              <div>
                <p className="font-semibold">{need.assignment.refereeName}</p>
                <p className="text-xs">Definitief bevestigd</p>
              </div>
            </div>
          ) : latestOffer ? (
            <div>
              <p className="font-semibold text-slate-800">{latestOffer.refereeName}</p>
              <p className="text-slate-600">{OFFER_STATUS[latestOffer.status]}</p>
              {latestOffer.status === "pending" && (
                <p className="mt-1 text-xs text-slate-500">
                  Reageren voor {formatDateTime(latestOffer.expiresAt)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-500">Nog geen offer verstuurd</p>
          )}
        </div>
      </div>

      {(["open", "matching"] as PlannerNeed["status"][]).includes(need.status) && (
        <OfferComposer need={need} profiles={profiles} onMessage={onMessage} />
      )}
      {need.status === "awaiting_confirmation" && (
        <ConfirmationAction need={need} onMessage={onMessage} />
      )}
      {need.status === "assigned" && (
        <CancellationAction need={need} onMessage={onMessage} />
      )}
      <AuditTrail needId={need.needId} />
    </article>
  );
}

export function RefereePlanningQueue({
  clubId,
}: {
  clubId: Id<"clubs"> | null;
}) {
  const [message, setMessage] = useState("");
  const identityStatus = useQuery(api.clubIdentity.getMyM1Status, {});
  const membership = clubId
    ? identityStatus?.memberships.find(
        (item) =>
          item.clubId === clubId &&
          item.status === "active" &&
          item.roles.some((role) => role === "club_admin" || role === "planner")
      )
    : undefined;
  const plannerReady = Boolean(clubId && membership);
  const queue = useQuery(
    api.refereeAssignmentQueries.listPlannerQueue,
    plannerReady && clubId ? { clubId } : "skip"
  );
  const profiles = useQuery(
    api.refereeDomain.listPlannerRefereeProfiles,
    plannerReady && clubId ? { clubId } : "skip"
  );
  const boardData = useQuery(
    api.admin.listAssignmentBoard,
    plannerReady ? { seasonKey: activeSeasonKey() } : "skip"
  ) as AssignmentBoardMatch[] | undefined;

  if (!clubId) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Er is nog geen club beschikbaar. Laad eerst de synthetische seed-data.
      </section>
    );
  }
  if (identityStatus === undefined) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Plannerrechten controleren...
      </section>
    );
  }
  if (!membership) return <PlannerActivation clubId={clubId} />;
  if (queue === undefined || profiles === undefined || boardData === undefined) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Planning laden...
      </section>
    );
  }

  const sortedQueue = [...queue].sort(
    (left, right) =>
      (left.match.scheduledAt ?? Number.MAX_SAFE_INTEGER) -
      (right.match.scheduledAt ?? Number.MAX_SAFE_INTEGER)
  );
  const openCount = queue.filter((need) =>
    ["open", "matching"].includes(need.status)
  ).length;
  const responseCount = queue.filter(
    (need) => need.status === "awaiting_response"
  ).length;
  const confirmationCount = queue.filter(
    (need) => need.status === "awaiting_confirmation"
  ).length;
  const assignedCount = queue.filter((need) => need.status === "assigned").length;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Referee planning</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Aanvragen, offers en bevestigingen
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary label="Open" value={openCount} />
            <Summary label="Reactie" value={responseCount} />
            <Summary label="Bevestigen" value={confirmationCount} />
            <Summary label="Toegewezen" value={assignedCount} />
          </div>
        </div>

        <div className="mt-5">
          <NeedCreator
            clubId={clubId}
            queue={queue}
            matches={boardData}
            onMessage={setMessage}
          />
        </div>
      </section>

      {message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800"
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Melding sluiten"
            className="rounded-md p-2 hover:bg-slate-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {sortedQueue.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <AlertTriangle className="mx-auto text-slate-400" size={24} />
          <h3 className="mt-3 font-semibold text-slate-900">Nog geen aanvragen</h3>
          <p className="mt-1 text-sm text-slate-500">
            Maak hierboven de eerste scheidsrechteraanvraag voor een wedstrijd.
          </p>
        </section>
      ) : (
        <section aria-label="Plannerwachtrij" className="space-y-3">
          {sortedQueue.map((need) => (
            <NeedRow
              key={need.needId}
              need={need}
              profiles={profiles}
              onMessage={setMessage}
            />
          ))}
        </section>
      )}
    </div>
  );
}
