import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LiveReplanPanel } from "./LiveReplanPanel";
import { assistantSourceFixture } from "@/test/fixtures/coachAssistant";
import { liveProposal } from "../../../convex/lib/coachAssistantLive";

const mocks = vi.hoisted(() => ({ query: vi.fn(), save: vi.fn() }));
vi.mock("convex/react", () => ({ useConvex: () => ({ query: mocks.query }), useMutation: () => mocks.save }));
const source = assistantSourceFixture();
Object.assign(source.match, { status: "live", startedAt: Date.now() - 1200000, quarterStartedAt: Date.now() - 1200000 });
const proposal = liveProposal(source, 10, Date.now());
afterEach(cleanup);
beforeEach(() => { mocks.query.mockReset().mockResolvedValue(proposal); mocks.save.mockReset().mockResolvedValue({ savedItems: 6 }); });
it("links the pre-match plan to the selected real match", () => {
  render(<LiveReplanPanel matchId={source.match._id} status="scheduled" canEdit publicCode="9Q7WH6" />);
  expect(screen.getByRole("link", { name: "Voorbereiden & oefenen" })).toHaveAttribute("href", "/coach/assistent?wedstrijd=9Q7WH6");
  expect(screen.queryByRole("button", { name: "Bereken vanaf nu" })).not.toBeInTheDocument();
});
it("requires an explicit acceptance after preview, then saves the same revision and interval", async () => {
  const user = userEvent.setup();
  render(<LiveReplanPanel matchId={source.match._id} status="live" canEdit />);
  await user.click(screen.getByRole("button", { name: "Bereken vanaf nu" }));
  expect(mocks.save).not.toHaveBeenCalled();
  expect(screen.getByText(/Vervolg vanaf minuut/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Gebruik dit vervolgplan" }));
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ matchId: source.match._id, intervalMinutes: 10,
    expectedRevision: proposal.revision, calculatedAt: proposal.calculatedAt, reviewed: true }));
  expect(screen.getByRole("status")).toHaveTextContent("Vervolgplan opgeslagen");
});
it("shows backend stale errors and clears a preview when changing the interval", async () => {
  const user = userEvent.setup();
  mocks.save.mockRejectedValue(new Error("De wedstrijd is gewijzigd. Bereken opnieuw."));
  render(<LiveReplanPanel matchId={source.match._id} status="halftime" canEdit />);
  await user.click(screen.getByRole("button", { name: "Bereken vanaf nu" }));
  await user.click(screen.getByRole("button", { name: "Gebruik dit vervolgplan" }));
  expect(screen.getByRole("alert")).toHaveTextContent("gewijzigd");
  await user.selectOptions(screen.getByRole("combobox", { name: "Wisselinterval" }), "5");
  expect(screen.queryByRole("button", { name: "Gebruik dit vervolgplan" })).not.toBeInTheDocument();
});
it("does not let a non-lead coach calculate or accept", () => {
  render(<LiveReplanPanel matchId={source.match._id} status="live" canEdit={false} />);
  expect(screen.getByRole("button", { name: "Bereken vanaf nu" })).toBeDisabled();
});

it("requests a fresh server clock on each calculation", async () => {
  const user = userEvent.setup();
  render(<LiveReplanPanel matchId={source.match._id} status="live" canEdit />);
  await user.click(screen.getByRole("button", { name: "Bereken vanaf nu" }));
  const first = mocks.query.mock.calls[0][1].requestId;
  await user.click(screen.getByRole("button", { name: "Bereken vanaf nu" }));
  expect(mocks.query.mock.calls[1][1].requestId).not.toBe(first);
});
