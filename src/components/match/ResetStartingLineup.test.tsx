import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { ResetStartingLineup } from "./ResetStartingLineup";

afterEach(cleanup);
it("does not reset on the first click or cancel, and sends the state from confirmation opening", async () => {
  const user = userEvent.setup(); const reset = vi.fn().mockResolvedValue(null);
  vi.mocked(useMutation).mockReturnValue(Object.assign(reset, { withOptimisticUpdate: vi.fn() }));
  const props = { matchId: "match" as Id<"matches">, players: [{ matchPlayerId: "mp" as Id<"matchPlayers">, playerId: "p" as Id<"players">, name: "Speler", onField: true, isKeeper: true, fieldSlotIndex: 0 }] };
  const { rerender } = render(<ResetStartingLineup {...props} />);
  await user.click(screen.getByRole("button", { name: "Beginopstelling leegmaken" }));
  expect(reset).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Annuleren" }));
  expect(reset).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Beginopstelling leegmaken" }));
  rerender(<ResetStartingLineup {...props} players={[{ ...props.players[0], fieldSlotIndex: 2 }]} />);
  await user.click(screen.getByRole("button", { name: "Ja, beginopstelling leegmaken" }));
  expect(reset).toHaveBeenCalledExactlyOnceWith({ matchId: "match", expectedRevision: JSON.stringify([["p", true, true, 0, false, false]]), confirmed: true });
});
