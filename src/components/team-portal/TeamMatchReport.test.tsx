import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName, type FunctionReference } from "convex/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  convexAuth: vi.fn(),
  query: vi.fn<(reference: unknown, args: unknown) => unknown>(),
  buildReport: vi.fn<(match: unknown) => { marker: string } | null>(),
  signInProps: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: mocks.auth,
  SignInButton: (props: { children: ReactNode; forceRedirectUrl?: string; signUpForceRedirectUrl?: string; withSignUp?: boolean }) => {
    mocks.signInProps(props);
    return <div data-testid="sign-in-control">{props.children}</div>;
  },
}));

vi.mock("convex/react", () => ({ useQuery: mocks.query, useConvexAuth: mocks.convexAuth }));
vi.mock("@/lib/team-portal/matchReport", () => ({ buildMatchReport: mocks.buildReport }));
vi.mock("./ConnectedPlayerReviews", () => ({ ConnectedPlayerReviews: () => <section>Persoonlijke spelerformulieren</section> }));
vi.mock("./AfterMatchReportView", () => ({
  AfterMatchReportView: ({ report }: { report: { marker: string } }) => <article aria-label="Testwedstrijdverslag">{report.marker}</article>,
}));

interface MatchSummary {
  _id: string;
  teamId: string;
  status: "finished" | "live" | "scheduled";
  scheduledAt: number;
  opponent: string;
  isHome: boolean;
  homeScore: number;
  awayScore: number;
}

interface MatchDetail {
  _id: string;
  teamId: string;
  status: "finished" | "live";
  cancelledAt?: number;
  players: Array<{ name: string }>;
}

interface CoachData {
  coach: { id: string; name: string };
  teams: Array<{ id: string; name: string; slug?: string }>;
  matches: MatchSummary[];
  viewingAsAdmin: boolean;
}

const teamId = "team-jo13-2";
const matchId = "match-finished";
const privateName = "Privéspeler uit de registratie";
const queryNames = {
  coach: "matches:verifyCoachAccess",
  team: "teams:getBySlug",
  detail: "matches:getForCoach",
};

let TeamMatchReport: (typeof import("./TeamMatchReport"))["TeamMatchReport"];
let coachData: CoachData | null | undefined;
let team: { id: string; name: string; slug: string } | null | undefined;
let details: Record<string, MatchDetail | null | undefined>;
let failingQuery: string | null;

function queryName(reference: unknown): string {
  return typeof reference === "string" ? reference : getFunctionName(reference as FunctionReference<"query">);
}

function detailQueries() {
  return mocks.query.mock.calls.filter(([reference]) => queryName(reference) === queryNames.detail);
}

function summary(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return { _id: matchId, teamId, status: "finished", scheduledAt: Date.UTC(2026, 8, 26, 9), opponent: "Groenwit", isHome: true, homeScore: 3, awayScore: 2, ...overrides };
}

function matchDetail(overrides: Partial<MatchDetail> = {}): MatchDetail {
  return { _id: matchId, teamId, status: "finished", players: [{ name: privateName }], ...overrides };
}

beforeAll(async () => {
  // TeamMatchReport reads the public Clerk setting once when its module loads.
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_team_report_boundary");
  ({ TeamMatchReport } = await import("./TeamMatchReport"));
});

afterAll(() => vi.unstubAllEnvs());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockReturnValue({ isLoaded: true, isSignedIn: true, userId: "coach-account" });
  mocks.convexAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });
  team = { id: teamId, name: "DIA JO13-2", slug: "jo13-2" };
  coachData = { coach: { id: "coach-id", name: "Coach" }, teams: [{ id: teamId, name: "DIA JO13-2", slug: "jo13-2" }], matches: [summary()], viewingAsAdmin: false };
  details = { [matchId]: matchDetail() };
  failingQuery = null;
  mocks.query.mockImplementation((reference, args) => {
    const name = queryName(reference);
    if (name === failingQuery) throw new Error("Simulated query failure");
    if (name === queryNames.coach) return coachData;
    if (name === queryNames.team) return team;
    if (name === queryNames.detail) return details[(args as { matchId: string }).matchId];
    throw new Error(`Unexpected query: ${name}`);
  });
  mocks.buildReport.mockImplementation((match) => ({ marker: (match as MatchDetail).players.map((player) => player.name).join(", ") }));
});

describe("TeamMatchReport authenticated boundary", () => {
  it("makes no data queries while signed out and returns login to the selected report route", () => {
    mocks.auth.mockReturnValue({ isLoaded: true, isSignedIn: false, userId: null });
    render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.buildReport).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Inloggen met mijn coachaccount" })).toBeVisible();
    expect(mocks.signInProps).toHaveBeenCalledWith(expect.objectContaining({
      forceRedirectUrl: "/team/jo13-2/verslag",
      signUpForceRedirectUrl: "/team/jo13-2/verslag",
      withSignUp: false,
    }));
  });

  it.each(["clerk-loading", "convex-loading", "convex-unconfirmed"] as const)("does not query data when authentication is %s", (phase) => {
    if (phase === "clerk-loading") mocks.auth.mockReturnValue({ isLoaded: false, isSignedIn: undefined, userId: undefined });
    else mocks.convexAuth.mockReturnValue({ isLoading: phase === "convex-loading", isAuthenticated: false });
    render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(screen.queryByText(privateName)).not.toBeInTheDocument();
    if (phase === "convex-unconfirmed") expect(screen.getByRole("heading", { name: "Je toegang kon niet worden bevestigd" })).toBeVisible();
    else expect(screen.getByRole("status")).toHaveTextContent("Wedstrijdgegevens laden");
  });

  it.each(["no-coach-access", "different-team", "missing-team"] as const)("withholds detail queries for %s", (reason) => {
    if (reason === "no-coach-access") coachData = null;
    else if (reason === "missing-team") team = null;
    else coachData!.teams = [{ id: "other-team", name: "JO15-1" }];
    render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.getByRole("heading", { name: "Geen toegang tot dit team" })).toBeVisible();
    expect(detailQueries()).toHaveLength(0);
    expect(mocks.buildReport).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("matches an admin's slugless team entry by the independently resolved team ID", () => {
    coachData!.viewingAsAdmin = true;
    coachData!.teams = [{ id: teamId, name: "DIA JO13-2" }];
    render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(mocks.query.mock.calls.some(([reference, args]) => queryName(reference) === queryNames.team && (args as { teamSlug: string }).teamSlug === "jo13-2")).toBe(true);
    expect(screen.getByRole("article", { name: "Testwedstrijdverslag" })).toHaveTextContent(privateName);
    expect(detailQueries()[0]?.[1]).toEqual({ matchId });
  });

  it("selects only finished matches of this team and switches to their own detail query", async () => {
    const user = userEvent.setup();
    coachData!.matches = [
      summary({ _id: "older", scheduledAt: Date.UTC(2026, 8, 19, 9), opponent: "Blauwbrug" }),
      summary(),
      summary({ _id: "live", status: "live", opponent: "Nog bezig" }),
      summary({ _id: "scheduled", status: "scheduled", opponent: "Nog gepland" }),
      summary({ _id: "foreign", teamId: "different-team", opponent: "Ander team" }),
    ];
    details.older = matchDetail({ _id: "older", players: [{ name: "Naam oudere wedstrijd" }] });
    render(<TeamMatchReport teamSlug="jo13-2" />);
    const selector = screen.getByRole("combobox", { name: /Afgeronde wedstrijd/ });
    expect(screen.getAllByRole("option").map((option) => (option as HTMLOptionElement).value)).toEqual([matchId, "older"]);
    expect(selector).toHaveValue(matchId);
    await user.selectOptions(selector, "older");
    expect(screen.queryByText(privateName)).not.toBeInTheDocument();
    expect(screen.getByText("Naam oudere wedstrijd")).toBeVisible();
    expect(detailQueries().every(([, args]) => [matchId, "older"].includes((args as { matchId: string }).matchId))).toBe(true);
    expect(detailQueries().at(-1)?.[1]).toEqual({ matchId: "older" });
  });

  it("shows an empty state without a detail query when no finished match is available", () => {
    coachData!.matches = [summary({ status: "live" })];
    render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.getByRole("heading", { name: "Nog geen afgeronde wedstrijden" })).toBeVisible();
    expect(detailQueries()).toHaveLength(0);
  });

  it.each(["null", "different-id", "different-team", "unfinished", "cancelled"] as const)("does not map or display %s match details", (reason) => {
    details[matchId] = reason === "null" ? null : matchDetail({
      ...(reason === "different-id" ? { _id: "wrong-match" } : {}),
      ...(reason === "different-team" ? { teamId: "wrong-team" } : {}),
      ...(reason === "unfinished" ? { status: "live" } : {}),
      ...(reason === "cancelled" ? { cancelledAt: Date.UTC(2026, 8, 26, 8) } : {}),
    });
    render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(mocks.buildReport).not.toHaveBeenCalled();
    expect(screen.queryByText(privateName)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: reason === "unfinished" || reason === "cancelled" ? "Nog geen eindverslag" : "Wedstrijd niet beschikbaar" })).toBeVisible();
  });

  it.each(["coach", "team", "detail"] as const)("handles a loading %s query without revealing report data", (pending) => {
    if (pending === "coach") coachData = undefined;
    else if (pending === "team") team = undefined;
    else details[matchId] = undefined;
    render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.getByRole("status")).toHaveTextContent("Wedstrijdgegevens laden");
    expect(mocks.buildReport).not.toHaveBeenCalled();
    expect(screen.queryByText(privateName)).not.toBeInTheDocument();
    if (pending !== "detail") expect(detailQueries()).toHaveLength(0);
  });

  it.each(["clerk-logout", "convex-session-loss"] as const)("immediately hides previously fetched player names after %s", (reason) => {
    const { rerender } = render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.getByText(privateName)).toBeVisible();
    if (reason === "clerk-logout") mocks.auth.mockReturnValue({ isLoaded: true, isSignedIn: false, userId: null });
    else mocks.convexAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    mocks.query.mockClear();
    mocks.buildReport.mockClear();
    rerender(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.queryByText(privateName)).not.toBeInTheDocument();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.buildReport).not.toHaveBeenCalled();
  });

  it("does not retain report contents when another signed-in account lacks team permission", () => {
    const { rerender } = render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.getByText(privateName)).toBeVisible();
    mocks.auth.mockReturnValue({ isLoaded: true, isSignedIn: true, userId: "another-account" });
    coachData = null;
    mocks.query.mockClear();
    rerender(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.queryByText(privateName)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Geen toegang tot dit team" })).toBeVisible();
    expect(detailQueries()).toHaveLength(0);
  });

  it.each([queryNames.coach, queryNames.detail])("handles %s query failure and can retry without retaining stale report contents", async (query) => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.getByText(privateName)).toBeVisible();
    failingQuery = query;
    rerender(<TeamMatchReport teamSlug="jo13-2" />);
    expect(screen.queryByText(privateName)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Het verslag kon niet worden geladen" })).toBeVisible();
    failingQuery = null;
    await user.click(screen.getByRole("button", { name: "Opnieuw proberen" }));
    expect(screen.getByText(privateName)).toBeVisible();
  });
});
