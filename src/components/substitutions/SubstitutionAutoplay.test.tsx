import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { REESHOF_PLAN, REESHOF_SOURCE_DETAILS } from "@/lib/substitutions/reeshofPlan";
import { SubstitutionDemo } from "./SubstitutionDemo";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderReeshof() {
  render(<SubstitutionDemo source={{ ...REESHOF_SOURCE_DETAILS, notes: [...REESHOF_SOURCE_DETAILS.notes], initialPlan: REESHOF_PLAN }} />);
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function approve() {
  click("Bron controleren");
  fireEvent.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, aanwezigheid, opstelling en wissels/ }));
  click("Plan goedkeuren en proberen");
}

function autoplay() {
  return screen.getByRole("checkbox", { name: "Wissels automatisch volgens plan" });
}

function events() {
  const section = screen.getByRole("heading", { name: "Geregistreerd in de demo" }).closest("section");
  if (!section) throw new Error("Gebeurtenissen ontbreken");
  return within(section).getAllByRole("listitem");
}

function advance(milliseconds: number) {
  act(() => { vi.advanceTimersByTime(milliseconds); });
}

function fakeClock() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"] });
}

describe("automatic execution of the approved substitution plan", () => {
  it("requires approval, executes the ten-minute group on the running clock and completes both halves with the planned minutes", () => {
    fakeClock();
    renderReeshof();
    expect(autoplay()).toBeChecked();
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volgend moment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "+1 minuut" })).toBeDisabled();
    click("Bron controleren");
    expect(screen.getByRole("button", { name: "Plan goedkeuren en proberen" })).toBeDisabled();
    approve();
    click("Start demo");

    advance(9750);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("09:45");
    expect(screen.getByRole("button", { name: "Tygo 11 op LW" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    advance(250);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    expect(screen.getByText("Klok loopt", { exact: true })).toBeVisible();
    expect(events()).toHaveLength(1);
    expect(events()[0]).toHaveTextContent("10:00Tygo 11 → Lucas 7 · Olivier 9 → Revi 5 · Krijn 10 ↔ Revi 5");
    expect(screen.getByRole("button", { name: "Lucas 7 op LW" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Krijn 10 op CB" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Revi 5 op CM" })).toBeVisible();

    advance(20000);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("30:00");
    expect(screen.getByText("Rust", { exact: true })).toBeVisible();
    expect(events()).toHaveLength(3);
    expect(events()[0]).toHaveTextContent("30:00Max 18 → Olivier 9 · Sem 15 → Lukas 14");
    expect(screen.getByRole("button", { name: "Olivier 9 op CB" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Lukas 14 op CDM" })).toBeVisible();
    advance(60000);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("30:00");
    expect(events()).toHaveLength(3);
    click("Start tweede helft");
    advance(30000);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("60:00");
    expect(screen.getByText("Afgelopen", { exact: true })).toBeVisible();
    expect(events()).toHaveLength(5);
    expect(events().map((event) => event.textContent?.slice(0, 5))).toEqual(["50:00", "40:00", "30:00", "20:00", "10:00"]);
    expect(screen.getByRole("button", { name: "Olivier 9 op RB" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Jody 2 op CB" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Max 18 op CM" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    click("Plan & werkelijk");
    const section = screen.getByRole("heading", { name: "Het plan naast de uitvoering" }).closest("section");
    if (!section) throw new Error("Vergelijking ontbreekt");
    const table = within(section);
    const expectedMinutes: Record<string, number> = {
      Jody: 40, Loek: 50, Luc: 60, Revi: 50, Lukas: 50, Miloud: 40, Sem: 50,
      Tygo: 50, Olivier: 40, Krijn: 60, Lucas: 50, Maceo: 40, Max: 40, Matteo: 40,
    };
    for (const [name, value] of Object.entries(expectedMinutes)) {
      const row = table.getByText(name, { exact: true }).closest("tr");
      if (!row) throw new Error(`Minutenregel ontbreekt voor ${name}`);
      expect(within(row).getAllByRole("cell").slice(1).map((cell) => cell.textContent))
        .toEqual([String(value), String(value), String(value), "0 min"]);
    }
    const totalRow = table.getByText("Totaal", { exact: true }).closest("tr");
    if (!totalRow) throw new Error("Totaalregel ontbreekt");
    expect(within(totalRow).getAllByRole("cell").slice(1, 4).map((cell) => cell.textContent)).toEqual(["660", "660", "660"]);
    expect(table.queryByRole("row", { name: /Luuk/ })).not.toBeInTheDocument();
  });

  it("applies moment and minute steps once, including the substitutions at halftime", () => {
    fakeClock();
    renderReeshof();
    approve();
    click("Volgend moment");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    expect(screen.getByText("Gepauzeerd", { exact: true })).toBeVisible();
    expect(events()).toHaveLength(1);
    click("+1 minuut");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("11:00");
    expect(events()).toHaveLength(1);
    click("Volgend moment");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("20:00");
    expect(events()).toHaveLength(2);
    click("Hervatten");
    advance(9000);
    click("Pauzeren");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("29:00");
    click("+1 minuut");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("30:00");
    expect(screen.getByText("Rust", { exact: true })).toBeVisible();
    expect(events()).toHaveLength(3);
    expect(screen.getByRole("button", { name: "+1 minuut" })).toBeDisabled();
    click("Start tweede helft");
    click("+1 minuut");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("31:00");
    expect(screen.getByText("Gepauzeerd", { exact: true })).toBeVisible();
    expect(events()).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retains manual execution when autoplay is unchecked", () => {
    fakeClock();
    renderReeshof();
    approve();
    fireEvent.click(autoplay());
    expect(autoplay()).not.toBeChecked();
    click("Start demo");
    advance(10000);
    click("Pauzeren");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    expect(screen.getByRole("button", { name: "Tygo 11 op LW" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Olivier 9 op CB" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    click("Alle resterende om 10:00");
    expect(events()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Lucas 7 op LW" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Revi 5 op CM" })).toBeVisible();
    click("Volgend moment");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("20:00");
    expect(events()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Jody 2 op LB" })).toBeVisible();
  });

  it.each([
    ["Krijn 10 op CM", "Revi 5 op CB"],
    ["Revi 5 op CB", "Krijn 10 op CM"],
  ])("does not repeat an early planned position swap selected as %s then %s", (first, second) => {
    fakeClock();
    renderReeshof();
    approve();
    click("+1 minuut");
    click("Voer wissel uit: Tygo 11 eruit, Lucas 7 erin");
    click("Voer wissel uit: Olivier 9 eruit, Revi 5 erin");
    click("Posities ruilen");
    click(first);
    click(second);
    click("Ruil posities");

    expect(screen.getByRole("button", { name: "Krijn 10 op CB" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Revi 5 op CM" })).toBeVisible();
    expect(events()).toHaveLength(3);

    click("Hervatten");
    advance(9000);
    click("Pauzeren");
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    expect(events()).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Krijn 10 op CB" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Revi 5 op CM" })).toBeVisible();
    expect(events()[0]).toHaveTextContent("01:00Krijn 10 ↔ Revi 5");
    expect(events()[0]).toHaveTextContent("(plan 10′)");
    expect(screen.getByText("Gepland 20′")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("pauses on a conflicting planned group without applying its valid first action", () => {
    fakeClock();
    renderReeshof();
    approve();
    click("+1 minuut");
    click("Olivier 9 op CB");
    click("Matteo 3");
    expect(events()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Matteo 3 op CB" })).toBeVisible();
    click("Hervatten");
    advance(9000);
    expect(screen.getByText("Gepauzeerd", { exact: true })).toBeVisible();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("button", { name: "Tygo 11 op LW" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Lucas 7" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Matteo 3 op CB" })).toBeVisible();
    expect(events()).toHaveLength(1);
    const stoppedTime = screen.getByTestId("demo-clock").textContent;
    advance(10000);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent(stoppedTime ?? "");
    expect(events()).toHaveLength(1);
  });
});
