import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaimWindowStrip } from "./ClaimWindowStrip";

const mocks = vi.hoisted(() => ({
  window: null as null | { isEffectivelyOpen: boolean; status: string; closesAt?: number },
  open: vi.fn(),
}));

vi.mock("@/convex/_generated/api", () => ({ api: { admin: {
  getClaimWindowForWeek: "window", getWeekAssignmentStats: "stats", listUnassignedForWeek: "unassigned",
  openClaimWindow: "open", closeClaimWindow: "close", sendEmailNudgeNow: "email",
} } }));
vi.mock("convex/react", () => ({
  useQuery: (query: string) => query === "window" ? mocks.window : query === "stats"
    ? { weekLabel: "21-27 09", claimed: 0, total: 1, unassigned: 1 } : [],
  useMutation: (mutation: string) => mutation === "open" ? mocks.open : vi.fn(),
}));

beforeEach(() => {
  mocks.window = null;
  mocks.open.mockReset().mockResolvedValue("window1");
});

describe("ClaimWindowStrip", () => {
  it("explains match-day claims for a round without a deadline", () => {
    mocks.window = { isEffectivelyOpen: true, status: "open" };
    render(<ClaimWindowStrip onStatusMessage={vi.fn()} />);
    expect(screen.getByText(/Geen vaste sluitdatum/)).toHaveTextContent(/wedstrijddag claimen/);
    expect(screen.getByRole("button", { name: "Sluit claimronde" })).toBeVisible();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it("still displays an existing explicit deadline", () => {
    mocks.window = { isEffectivelyOpen: true, status: "open", closesAt: Date.parse("2026-09-25T20:00:00+02:00") };
    render(<ClaimWindowStrip onStatusMessage={vi.fn()} />);
    expect(screen.getByText(/· sluit/)).toHaveTextContent("20:00");
    expect(screen.queryByText(/Geen vaste sluitdatum/)).not.toBeInTheDocument();
  });

  it("opens without setting a fixed deadline or requesting e-mail", async () => {
    const onStatusMessage = vi.fn();
    render(<ClaimWindowStrip onStatusMessage={onStatusMessage} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Open claimronde" }));
    expect(mocks.open).toHaveBeenCalledWith({ weekStartMs: expect.any(Number), sendEmailNudge: false });
    expect(onStatusMessage).toHaveBeenCalledWith("Claimronde geopend.");
  });
});
