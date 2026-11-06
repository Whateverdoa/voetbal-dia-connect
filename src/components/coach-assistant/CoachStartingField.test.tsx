import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { CoachStartingField } from "./CoachStartingField";
import { DEMO_PLAN } from "@/lib/substitutions/demoPlan";

afterEach(cleanup);
it("requires a separate confirmation and supports canceling a local lineup reset", async () => {
  const user = userEvent.setup(); const onChange = vi.fn(); const onKeeperChange = vi.fn();
  render(<CoachStartingField plan={DEMO_PLAN} players={DEMO_PLAN.players.map((player) => ({ key: player.key, availability: "present", primaryPosition: null, secondaryPosition: null }))} field={DEMO_PLAN.startingLineup.field.filter((entry) => entry.playerKey !== DEMO_PLAN.startingLineup.keeperKey)} keeperKey={DEMO_PLAN.startingLineup.keeperKey} onChange={onChange} onKeeperChange={onKeeperChange} />);
  await user.click(screen.getByRole("button", { name: "Beginopstelling leegmaken" }));
  expect(onChange).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Annuleren" }));
  expect(onChange).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Beginopstelling leegmaken" }));
  await user.click(screen.getByRole("button", { name: "Ja, beginopstelling leegmaken" }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith([]);
  expect(onKeeperChange).toHaveBeenCalledExactlyOnceWith("");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});
