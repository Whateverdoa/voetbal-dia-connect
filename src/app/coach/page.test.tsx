import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useQuery, useConvexConnectionState } from "convex/react";
import type { ComponentType } from "react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useConvexConnectionState: vi.fn(),
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseConnection = vi.mocked(useConvexConnectionState);

let CoachLoginPage: ComponentType;

describe("CoachLoginPage (Clerk-only)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseConnection.mockReturnValue({
      isWebSocketConnected: true,
      hasEverConnected: true,
      isLoading: false,
    } as never);
    mockUseQuery.mockReturnValue(undefined);

    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_xxx";
    vi.resetModules();
    const mod = await import("./page");
    CoachLoginPage = mod.default;
  });

  it("shows loading state while access is being checked", async () => {
    render(<CoachLoginPage />);
    await waitFor(() => {
      expect(screen.getByText("Coachrechten controleren...")).toBeInTheDocument();
    });
  });

  it("shows no-access message when user has no coach link", async () => {
    mockUseQuery.mockReturnValue(null);
    render(<CoachLoginPage />);

    await waitFor(() => {
      expect(screen.getByText("Geen coachtoegang")).toBeInTheDocument();
    });
  });

  it("renders dashboard when coach data is available", async () => {
    mockUseQuery.mockReturnValue({
      coach: { id: "coach123", name: "Coach Mike" },
      teams: [{ id: "team456", name: "JO12-1" }],
      matches: [],
    } as never);

    render(<CoachLoginPage />);

    await waitFor(() => {
      expect(screen.getByText("Welkom, Coach Mike!")).toBeInTheDocument();
    });
  });
});
