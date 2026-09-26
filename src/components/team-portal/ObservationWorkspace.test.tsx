import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyDemoCommand } from "@/lib/team-portal/commands";
import { createDemoState } from "@/lib/team-portal/fixtures";
import { emptyObservation } from "@/lib/team-portal/observationTypes";
import type { DemoActor, DemoCommand, DemoState } from "@/lib/team-portal/types";
import { ObservationWorkspace } from "./ObservationWorkspace";

const now = Date.UTC(2026, 8, 20, 10);
afterEach(cleanup);

function Harness({ initial, actor }: { initial: DemoState; actor: DemoActor }) {
  const [state, setState] = useState(initial);
  function command(command: DemoCommand) {
    try {
      setState(applyDemoCommand(state, actor, command, now));
      return true;
    } catch {
      return false;
    }
  }
  return <ObservationWorkspace state={state} actor={actor} onCommand={command} now={now} />;
}

describe("ObservationWorkspace", () => {
  it("defaults to disabled and lets the coach explicitly enable the workspace", async () => {
    const user = userEvent.setup();
    render(<Harness initial={createDemoState(now)} actor={{ role: "coach" }} />);
    expect(screen.queryByLabelText("Speler observeren")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Observaties inschakelen" }));
    expect(screen.getByLabelText("Speler observeren")).toBeVisible();
    expect(screen.getByRole("button", { name: "Observaties uitschakelen" })).toHaveAttribute("aria-pressed", "true");
  });

  it("saves, finalizes and preserves an observation as a read-only report before the next one", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ ...createDemoState(now), observationsEnabled: true, observations: [] }} actor={{ role: "coach" }} />);
    fireEvent.change(screen.getByLabelText("Sterke punten"), { target: { value: "  Rustige aanname onder druk.  " } });
    fireEvent.change(screen.getByLabelText("Ontwikkelpunten"), { target: { value: "Eerder over de schouder kijken." } });
    fireEvent.change(screen.getByLabelText("Vervolgafspraak"), { target: { value: "In de volgende training opnieuw bekijken." } });
    await user.selectOptions(screen.getByLabelText("Aanname en balcontrole: niveau"), "Passend bij de rol");
    expect(screen.getByRole("button", { name: "Intern vastleggen" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Concept bewaren" }));
    expect(screen.getByRole("button", { name: "Intern vastleggen" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Concreet voorbeeld · Aanname en balcontrole"), { target: { value: "  In minuut 18 nam de speler weg van de tegenstander aan.  " } });
    await user.click(screen.getByRole("button", { name: "Concept bewaren" }));
    expect(screen.getByRole("button", { name: "Intern vastleggen" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Intern vastleggen" }));
    expect(screen.getByRole("article", { name: "Intern vastgelegd observatieverslag" })).toBeVisible();
    expect(screen.getByText("Rustige aanname onder druk.")).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nieuwe observatie" }));
    expect(screen.getByLabelText("Sterke punten")).toHaveValue("");
    expect(screen.getByRole("button", { name: /Intern vastgelegd.*20 september 2026/ })).toBeVisible();
  });

  it("hides the other role's drafts while showing its final reports", async () => {
    const user = userEvent.setup();
    const state = createDemoState(now);
    state.observationsEnabled = true;
    state.observations = [
      ...state.observations!,
      { id: "scout-draft", authorRole: "scout", playerId: "p1", status: "draft", content: { ...emptyObservation("2026-09-17"), strengths: "Privéconcept van de scout." }, createdAt: now, updatedAt: now },
      { id: "coach-draft", authorRole: "coach", playerId: "p1", status: "draft", content: { ...emptyObservation("2026-09-18"), strengths: "Eigen coachnotitie." }, createdAt: now, updatedAt: now },
    ];
    render(<Harness initial={state} actor={{ role: "coach" }} />);
    expect(screen.queryByRole("button", { name: /17 september 2026/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Privéconcept van de scout.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Eigen concept.*18 september 2026/ }));
    expect(screen.getByLabelText("Sterke punten")).toHaveValue("Eigen coachnotitie.");
    await user.click(screen.getByRole("button", { name: /Intern vastgelegd.*Scout/ }));
    expect(screen.getByRole("article", { name: "Intern vastgelegd observatieverslag" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Concept bewaren" })).not.toBeInTheDocument();
  });

  it("shows no staff contents to parents or players, and no enable control to scouts", () => {
    const state = { ...createDemoState(now), observationsEnabled: true };
    const { rerender } = render(<ObservationWorkspace state={state} actor={{ role: "parent", guardianId: "family1" }} onCommand={vi.fn()} now={now} />);
    expect(screen.queryByLabelText("Speler observeren")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Observatiegeschiedenis")).not.toBeInTheDocument();
    rerender(<ObservationWorkspace state={state} actor={{ role: "player", playerId: "p1" }} onCommand={vi.fn()} now={now} />);
    expect(screen.queryByLabelText("Speler observeren")).not.toBeInTheDocument();
    rerender(<ObservationWorkspace state={{ ...state, observationsEnabled: false }} actor={{ role: "scout" }} onCommand={vi.fn()} now={now} />);
    expect(screen.queryByRole("button", { name: "Observaties inschakelen" })).not.toBeInTheDocument();
    expect(screen.getByText(/De coach kan deze optionele werkplek inschakelen/)).toBeVisible();
  });
});
