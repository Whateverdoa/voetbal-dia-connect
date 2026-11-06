import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEMO_PLAN, type DemoPlan } from "@/lib/substitutions/demoPlan";
import { StartingLineupEditor } from "./StartingLineupEditor";

afterEach(cleanup);

function Editor({ initial = DEMO_PLAN }: { initial?: DemoPlan }) {
  const [plan, setPlan] = useState(() => structuredClone(initial));
  return <StartingLineupEditor plan={plan} onChange={setPlan} />;
}

describe("starting lineup editor", () => {
  it("offers all present players per Dutch-labelled position and moves a chosen reserve into that slot", async () => {
    const user = userEvent.setup();
    const initial = structuredClone(DEMO_PLAN);
    initial.players.push({ key: "absent", name: "Afwezig", number: 21, absent: true });
    render(<Editor initial={initial} />);
    await user.click(screen.getByText("Beginposities handmatig instellen"));
    const central = screen.getByRole("combobox", { name: "Centrale middenvelder (CM), plek 7" });
    expect(within(central).getAllByRole("option")).toHaveLength(14);
    expect(within(central).queryByRole("option", { name: /Afwezig/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Bestaande geplande wissels blijven staan en worden opnieuw gecontroleerd/)).toBeVisible();
    await user.selectOptions(central, "krijn");
    expect(central).toHaveValue("krijn");
    expect(screen.getByText(/Bank:/).closest("p")).toHaveTextContent("Macéo 16 · Sem 15 · Lukas 14");
    expect(within(central).getByRole("option", { name: "Sem 15 · bank" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("swaps the corresponding field selects and lets a reserve occupy the goalkeeper slot", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(screen.getByText("Beginposities handmatig instellen"));
    const left = screen.getByRole("combobox", { name: "Linkshalf (LM), plek 6" });
    const central = screen.getByRole("combobox", { name: "Centrale middenvelder (CM), plek 7" });
    await user.selectOptions(left, "sem");
    expect(left).toHaveValue("sem");
    expect(central).toHaveValue("loek");
    const keeper = screen.getByRole("combobox", { name: "Keeper (GK), plek 1" });
    await user.selectOptions(keeper, "lukas");
    expect(keeper).toHaveValue("lukas");
    expect(screen.getByText(/Bank:/).closest("p")).toHaveTextContent("Macéo 16 · Krijn 10 · Luc 1");
    expect(screen.getByText("De gekozen speler wordt keeper.")).toBeVisible();
  });
});
