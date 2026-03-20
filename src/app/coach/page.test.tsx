import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockSignOut = vi.fn();
const mockUseClerk = vi.fn(() => ({ signOut: mockSignOut }));

vi.mock("@clerk/nextjs", () => ({
  useClerk: mockUseClerk,
}));

const originalClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

async function loadCoachPage(clerkEnabled: boolean) {
  vi.resetModules();
  if (clerkEnabled) {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_coach";
  } else {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }

  const convex = await import("convex/react");
  const pageModule = await import("./page");

  return {
    CoachPage: pageModule.default,
    mockUseQuery: vi.mocked(convex.useQuery),
  };
}

describe("CoachPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockUseClerk.mockReturnValue({ signOut: mockSignOut });
  });

  afterAll(() => {
    if (originalClerkKey) {
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalClerkKey;
    } else {
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    }
  });

  it("shows Clerk fallback copy when Clerk is disabled", async () => {
    const { CoachPage } = await loadCoachPage(false);

    render(<CoachPage />);

    expect(screen.getByText("Coach toegang")).toBeInTheDocument();
    expect(screen.getByText("Inloggen is nog niet actief")).toBeInTheDocument();
    expect(screen.getByText(/Clerk-login via e-mail en rollen/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terug naar home" })).toHaveAttribute("href", "/");
  });

  it("shows loading state while the coach dashboard query is pending", async () => {
    const { CoachPage, mockUseQuery } = await loadCoachPage(true);
    mockUseQuery.mockReturnValue(undefined);

    render(<CoachPage />);

    expect(screen.getByText("Coachdashboard laden...")).toBeInTheDocument();
  });

  it("shows no-access state when the signed-in user has no coach role", async () => {
    const { CoachPage, mockUseQuery } = await loadCoachPage(true);
    mockUseQuery.mockReturnValue(null);

    render(<CoachPage />);

    expect(screen.getByText("Geen coachtoegang")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Naar inloggen" })).toHaveAttribute("href", "/sign-in");

    fireEvent.click(screen.getByRole("button", { name: "Uitloggen" }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: "/" });
    });
  });

  it("renders the coach dashboard for a linked coach account", async () => {
    const { CoachPage, mockUseQuery } = await loadCoachPage(true);
    mockUseQuery.mockReturnValue({
      coach: { id: "coach-1", name: "Coach Mike" },
      teams: [{ id: "team-1", name: "JO12-1" }],
      matches: [
        {
          _id: "match-1",
          teamId: "team-1",
          opponent: "VV Oranje",
          isHome: true,
          status: "scheduled",
          publicCode: "ABC123",
          homeScore: 0,
          awayScore: 0,
          currentQuarter: 1,
          scheduledAt: Date.now() + 86400000,
        },
      ],
    });

    render(<CoachPage />);

    expect(screen.getByText("Welkom, Coach Mike!")).toBeInTheDocument();
    expect(screen.getAllByText("JO12-1").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Gepland" })).toBeInTheDocument();
    expect(screen.getByText(/VV Oranje/)).toBeInTheDocument();
  });
});

