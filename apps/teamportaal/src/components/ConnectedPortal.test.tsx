import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ConnectedPortal } from "./ConnectedPortal";
import { ReportMatchLink } from "./MatchLink";
import type { Overview, PlayerDetail } from "@/lib/portal";
const mocked = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), replace: vi.fn(), userId: null as string | null }));
vi.mock("convex/react", () => ({ useQuery: mocked.query, useMutation: () => mocked.mutate, useConvexAuth: () => ({ isLoading: false, isAuthenticated: Boolean(mocked.userId) }) }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, userId: mocked.userId }), UserButton: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocked.replace }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock("./cards/ShieldCard", () => ({ ShieldCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./cards/FootballShieldContent", () => ({ FootballShieldContent: () => null }));

let overview: Overview;
let detail: PlayerDetail;
beforeEach(() => {
  cleanup(); vi.clearAllMocks(); mocked.userId = null;
  overview = { team: { id: "t1", name: "Testteam", slug: "jo13-2" }, access: { signedIn: false, isCoach: false, isManager: false, isAdmin: false, isMember: false, isParent: false, ownPlayerIds: [] }, players: [], matches: [] };
  detail = { profile: { id: "p1", name: "Testkind", position: null, number: null, canOpen: true, canDevelop: true }, canDevelop: true, canEdit: false, canConsent: false, consent: null, published: [], draft: null };
  mocked.mutate.mockResolvedValue(1);
  mocked.query.mockImplementation(ref => { const name = getFunctionName(ref); if (name === "teamPortal:overview") return overview; if (name === "teamPortal:player") return detail; return null; });
});
describe("connected portal interface", () => {
  it.each(["visitor", "parent", "player", "manager", "coach"])("opens the match in the right view for %s with one neutral link", (role) => {
    mocked.userId = role === "visitor" ? null : role;
    overview.access = { ...overview.access, signedIn: role !== "visitor", isCoach: role === "coach", isParent: role === "parent", isManager: role === "manager" };
    overview.matches = [{ id: "match-1", publicCode: "ABC123", opponent: "Testteam", isHome: true, scheduledAt: null, status: "finished", homeScore: 2, awayScore: 1, venue: null }];
    render(<ReportMatchLink slug="jo13-2" matchId="match-1" />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open wedstrijd ↗" })).toHaveAttribute("href", role === "coach" ? "https://dialive.online/coach/match/match-1" : "https://dialive.online/live/ABC123");
    expect(screen.queryByText(/als coach/)).not.toBeInTheDocument();
  });
  it("does not show staff navigation to a visitor", () => {
    render(<ConnectedPortal />);
    expect(screen.queryByRole("link", { name: "Coachwerkplek" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teammanager" })).not.toBeInTheDocument();
  });
  it("allows coaches to enter both workspaces", () => {
    mocked.userId = "coach"; overview.access = { ...overview.access, signedIn: true, isCoach: true, isMember: true };
    render(<ConnectedPortal />);
    expect(screen.getByRole("link", { name: "Coachwerkplek" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teammanager" })).toBeInTheDocument();
  });
  it("does not show coaching to a manager", () => {
    mocked.userId = "manager"; overview.access = { ...overview.access, signedIn: true, isManager: true, isMember: true };
    render(<ConnectedPortal view="coaching" />);
    expect(screen.getByText("Dit onderdeel is afgeschermd")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Coachwerkplek" })).not.toBeInTheDocument();
  });
  it("lands a linked parent directly at the correct child", async () => {
    mocked.userId = "parent"; overview.access = { ...overview.access, signedIn: true, isParent: true, isMember: true, ownPlayerIds: ["p1"] };
    render(<ConnectedPortal view="start" />);
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith("/team/jo13-2/speler/p1"));
  });
  it("shows a child picker instead of choosing arbitrarily in a two-child family", () => {
    mocked.userId = "parent"; overview.access = { ...overview.access, signedIn: true, isParent: true, isMember: true, ownPlayerIds: ["p1", "p2"] };
    overview.players = [detail.profile, { ...detail.profile, id: "p2", name: "Tweede kind" }, { ...detail.profile, id: "p3", name: "Ander gezin", canDevelop: false }];
    render(<ConnectedPortal view="start" />);
    expect(screen.getByRole("link", { name: "Tweede kind" })).toBeInTheDocument();
    expect(screen.queryByText("Ander gezin")).not.toBeInTheDocument(); expect(mocked.replace).not.toHaveBeenCalled();
  });
  it("requires explicit review before publishing, saves a draft and keeps its revision", async () => {
    mocked.userId = "coach"; overview.access = { ...overview.access, signedIn: true, isCoach: true, isMember: true }; detail.canEdit = true;
    render(<ConnectedPortal view="player" playerId="p1" />);
    expect(screen.getByRole("button", { name: "Publiceren" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Welk concreet moment ging goed?"), { target: { value: "Een goede pass" } });
    fireEvent.change(screen.getByLabelText("Wat is één volgend oefenpunt?"), { target: { value: "Kijken voor ontvangst" } });
    fireEvent.click(screen.getByRole("button", { name: "Concept bewaren" }));
    await waitFor(() => expect(screen.getByText("Concept opgeslagen.")).toBeInTheDocument());
    expect(mocked.mutate).toHaveBeenLastCalledWith(expect.objectContaining({ action: "save", revision: 0 }));
    fireEvent.click(screen.getByRole("checkbox", { name: /nagelezen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Publiceren" }));
    await waitFor(() => expect(mocked.mutate).toHaveBeenLastCalledWith(expect.objectContaining({ action: "publish", revision: 1 })));
  });
  it("hides development and feedback editor from a permitted team-profile viewer", () => {
    mocked.userId = "manager"; detail.canDevelop = false; detail.profile.canDevelop = false;
    render(<ConnectedPortal view="player" playerId="p1" />);
    expect(screen.queryByText("Mijn ontwikkeling")).not.toBeInTheDocument();
    expect(screen.queryByText("Jouw coachfeedback")).not.toBeInTheDocument();
    expect(screen.getByText("Er zijn nog geen momenten gedeeld.")).toBeInTheDocument();
  });
});
