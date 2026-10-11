import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useConvexAuth, useMutation } from "convex/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcceptVoterInvite } from "./AcceptVoterInvite";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const accept = Object.assign(vi.fn().mockResolvedValue({ teamSlug: "jo13-1" }), { withOptimisticUpdate: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  accept.mockResolvedValue({ teamSlug: "jo13-1" });
  vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: true, isRefreshing: false });
  vi.mocked(useMutation).mockReturnValue(accept);
});

describe("voter invitation acceptance", () => {
  it("offers login and signup with the invitation preserved", () => {
    vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: false, isRefreshing: false });
    render(<AcceptVoterInvite teamSlug="jo13-1" token="invite-token" />);
    expect(screen.getByRole("link", { name: "Inloggen" })).toHaveAttribute("href", "/sign-in?returnTo=%2Fteam%2Fjo13-1%2Fapp%2Finvite%2Finvite-token");
    expect(screen.getByRole("link", { name: "Account maken" })).toHaveAttribute("href", "/sign-up?returnTo=%2Fteam%2Fjo13-1%2Fapp%2Finvite%2Finvite-token");
    expect(accept).not.toHaveBeenCalled();
  });

  it("accepts with the current signed-in account and opens the returned team portal", async () => {
    render(<AcceptVoterInvite teamSlug="jo13-1" token="invite-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Uitnodiging accepteren" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/team/jo13-1/app"));
    expect(accept).toHaveBeenCalledWith({ token: "invite-token" });
  });

  it("shows a rejected account or expired invitation without redirecting", async () => {
    accept.mockRejectedValueOnce(new Error("Log in met het e-mailadres van de uitnodiging"));
    render(<AcceptVoterInvite teamSlug="jo13-1" token="invite-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Uitnodiging accepteren" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("e-mailadres van de uitnodiging"));
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Uitnodiging accepteren" })).not.toBeDisabled();
  });
});
