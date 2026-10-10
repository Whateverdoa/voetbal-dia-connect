import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubstitutionDemo } from "./SubstitutionDemo";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type User = ReturnType<typeof userEvent.setup>;

async function approveExample(user: User) {
  await user.click(screen.getByRole("button", { name: "Bron controleren" }));
  await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, opstelling en wissels/ }));
  await user.click(screen.getByRole("button", { name: "Voorbeeld goedkeuren en proberen" }));
  expect(screen.getByRole("button", { name: "Start demo" })).toBeEnabled();
  // These scenarios exercise the explicit manual controls rather than plan autoplay.
  await user.click(screen.getByRole("checkbox", { name: "Wissels automatisch volgens plan" }));
}

async function startAtTenMinutes(user: User) {
  await approveExample(user);
  // Jump starts and pauses atomically; these scenarios never depend on timer speed or scheduling.
  await user.click(screen.getByRole("button", { name: "Volgend moment" }));
  expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
  expect(screen.getByText("Gepauzeerd", { exact: true })).toBeVisible();
}

function comparisonRows() {
  const section = screen.getByRole("heading", { name: "Het plan naast de uitvoering" }).closest("section");
  if (!section) throw new Error("Vergelijking ontbreekt");
  return within(section).getAllByRole("row").map((row) => row.textContent);
}

function eventRows() {
  const section = screen.getByRole("heading", { name: "Geregistreerd in de demo" }).closest("section");
  if (!section) throw new Error("Gebeurtenissen ontbreken");
  return within(section).getAllByRole("listitem");
}

describe("interactive substitution demo", () => {
  it("advances approved play by exact paused minutes, supports slower demo speeds and respects halftime and full time", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    expect(screen.getByRole("button", { name: "+1 minuut" })).toBeDisabled();
    await approveExample(user);
    const minuteButton = screen.getByRole("button", { name: "+1 minuut" });
    const speed = screen.getByRole("combobox", { name: "Demosnelheid" });
    await user.selectOptions(speed, "10");
    expect(speed).toHaveValue("10");
    await user.selectOptions(speed, "20");
    expect(speed).toHaveValue("20");

    await user.click(minuteButton);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("01:00");
    expect(screen.getByText("Gepauzeerd", { exact: true })).toBeVisible();
    await user.click(minuteButton);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("02:00");
    expect(screen.getByText("Gepauzeerd", { exact: true })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Volgend moment" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    await user.click(minuteButton);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("11:00");
    expect(screen.getByRole("button", { name: "Revi 5 op RW" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Macéo 16" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Formatie" }), "4-4-2");
    expect(minuteButton).toBeDisabled();
    await user.click(minuteButton);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("11:00");
    await user.click(screen.getByRole("button", { name: "Annuleren" }));
    await user.click(screen.getByRole("button", { name: "Volgend moment" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("20:00");
    for (let minute = 21; minute <= 30; minute += 1) {
      await user.click(minuteButton);
      expect(screen.getByTestId("demo-clock")).toHaveTextContent(`${minute}:00`);
    }
    expect(screen.getByText("Rust", { exact: true })).toBeVisible();
    expect(minuteButton).toBeDisabled();
    await user.click(minuteButton);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("30:00");

    // Frozen elapsed time keeps this transition independent of machine and render speed.
    await user.click(screen.getByRole("button", { name: "Start tweede helft" }));
    await user.click(minuteButton);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("31:00");
    expect(screen.getByText("Gepauzeerd", { exact: true })).toBeVisible();
    for (const expected of ["40:00", "50:00", "60:00"]) {
      await user.click(screen.getByRole("button", { name: "Volgend moment" }));
      expect(screen.getByTestId("demo-clock")).toHaveTextContent(expected);
    }
    expect(screen.getByText("Afgelopen", { exact: true })).toBeVisible();
    expect(minuteButton).toBeDisabled();
    await user.click(minuteButton);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("60:00");
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
  });

  it("starts without a photo, places a bench player and requires review before running", async () => {
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    await user.click(screen.getByRole("button", { name: "Zonder foto starten" }));
    await user.click(screen.getByText("Beginposities handmatig instellen", { exact: true }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Spits (ST), plek 10" }), "lukas");

    expect(screen.getByRole("button", { name: "Lukas 14 op ST" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Lucas 7" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Voer wissel uit:/ })).not.toBeInTheDocument();
    await approveExample(user);
    expect(screen.getByRole("button", { name: "Test: wissel op 12′" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Volgend moment" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("30:00");
    await user.click(screen.getByText("Zelf een wissel kiezen", { exact: true }));
    const outgoing = screen.getByRole("combobox", { name: "Speler eruit" });
    const incoming = screen.getByRole("combobox", { name: "Speler erin" });
    await user.selectOptions(outgoing, "lukas");
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    await user.selectOptions(incoming, "lucas");
    expect(screen.getByRole("button", { name: "Lucas 7 op ST" })).toBeVisible();
    expect(eventRows()).toHaveLength(1);
    expect(outgoing).toHaveValue("");
    expect(incoming).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Eén wissel uitvoeren" })).not.toBeInTheDocument();
  });

  it.each(["field first", "bench first"] as const)("immediately executes a matching planned pair (%s) and runs only the remaining group action", async (order) => {
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    await startAtTenMinutes(user);
    const fieldPlayer = screen.getByRole("button", { name: "Revi 5 op RW" });
    const benchPlayer = screen.getByRole("button", { name: "Macéo 16" });
    const [first, second] = order === "field first" ? [fieldPlayer, benchPlayer] : [benchPlayer, fieldPlayer];

    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    await user.click(second);
    const pitch = within(screen.getByRole("region", { name: "Actuele opstelling" }));
    expect(pitch.getByRole("button", { name: "Macéo 16 op RW" })).toBeVisible();
    expect(pitch.getByRole("button", { name: "Revi 5" })).toBeVisible();
    expect(pitch.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(0);
    expect(eventRows()).toHaveLength(1);
    expect(eventRows()[0]).toHaveTextContent("10:00Revi 5 → Macéo 16(plan 10′)");
    expect(screen.queryByRole("button", { name: "Voer wissel uit: Revi 5 eruit, Macéo 16 erin" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voer wissel uit: Sem 15 eruit, Krijn 10 erin" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Uitvoeren om 10:00" }));
    expect(eventRows()).toHaveLength(2);
    expect(eventRows().filter((event) => event.textContent?.includes("Revi 5 → Macéo 16"))).toHaveLength(1);
    expect(eventRows().filter((event) => event.textContent?.includes("Sem 15 → Krijn 10"))).toHaveLength(1);
    expect(pitch.getByRole("button", { name: "Krijn 10 op CM" })).toBeVisible();
    expect(pitch.getAllByRole("button", { name: / op / })).toHaveLength(11);
    expect(screen.getByText("Gepland 20′")).toBeVisible();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deselects repeated taps and replaces same-side choices before recording one unplanned substitution", async () => {
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    await startAtTenMinutes(user);
    const tygo = screen.getByRole("button", { name: "Tygo 11 op LW" });
    const lucas = screen.getByRole("button", { name: "Lucas 7 op ST" });
    const maceo = screen.getByRole("button", { name: "Macéo 16" });
    const lukas = screen.getByRole("button", { name: "Lukas 14" });
    await user.click(tygo);
    await user.click(tygo);
    expect(tygo).toHaveAttribute("aria-pressed", "false");
    await user.click(tygo);
    await user.click(lucas);
    expect(tygo).toHaveAttribute("aria-pressed", "false");
    expect(lucas).toHaveAttribute("aria-pressed", "true");
    await user.click(lucas);
    expect(lucas).toHaveAttribute("aria-pressed", "false");

    await user.click(maceo);
    await user.click(maceo);
    expect(maceo).toHaveAttribute("aria-pressed", "false");
    await user.click(maceo);
    await user.click(lukas);
    expect(maceo).toHaveAttribute("aria-pressed", "false");
    expect(lukas).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();

    await user.click(lucas);
    expect(screen.getByRole("button", { name: "Lukas 14 op ST" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Lucas 7" })).toBeVisible();
    expect(eventRows()).toHaveLength(1);
    expect(eventRows()[0]).toHaveTextContent("10:00Lucas 7 → Lukas 14");
    expect(eventRows()[0]).not.toHaveTextContent("(plan");
    expect(screen.getByText("Gepland 10′")).toBeVisible();
    expect(screen.getByRole("button", { name: "Voer wissel uit: Revi 5 eruit, Macéo 16 erin" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Voer wissel uit: Sem 15 eruit, Krijn 10 erin" })).toBeEnabled();
  });

  it("swaps two starting shields and requires a fresh review before kickoff", async () => {
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    await approveExample(user);

    await user.click(screen.getByRole("button", { name: "Loek 17 op LM" }));
    await user.click(screen.getByRole("button", { name: "Sem 15 op CM" }));
    await user.click(screen.getByRole("button", { name: "Ruil posities" }));

    expect(screen.getByRole("button", { name: "Loek 17 op CM" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sem 15 op LM" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bron controleren" }));
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, opstelling en wissels/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Voorbeeld goedkeuren en proberen" })).toBeDisabled();
    expect(screen.getByText(/Loek 17 \(CM\)/)).toHaveTextContent("Sem 15 (LM)");
  });

  it("places a bench player before kickoff without a match event and revokes the approved starting plan", async () => {
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    await approveExample(user);
    await user.click(screen.getByRole("button", { name: "Lucas 7 op ST" }));
    await user.click(screen.getByRole("button", { name: "Lukas 14" }));

    expect(screen.getByRole("button", { name: "Lukas 14 op ST" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Lucas 7" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bron controleren" }));
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, opstelling en wissels/ })).not.toBeChecked();
  });

  it("swaps live field positions while keeping the same players, bench and recorded minutes", async () => {
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    await startAtTenMinutes(user);
    await user.click(screen.getByRole("button", { name: "Plan & werkelijk" }));
    const before = comparisonRows();
    await user.click(screen.getByRole("button", { name: "Veld & wissels" }));

    await user.click(screen.getByRole("button", { name: "Posities ruilen" }));
    await user.click(screen.getByRole("button", { name: "Tygo 11 op LW" }));
    await user.click(screen.getByRole("button", { name: "Lucas 7 op ST" }));
    await user.click(screen.getByRole("button", { name: "Ruil posities" }));

    const pitch = within(screen.getByRole("region", { name: "Actuele opstelling" }));
    expect(pitch.getByRole("button", { name: "Tygo 11 op ST" })).toBeVisible();
    expect(pitch.getByRole("button", { name: "Lucas 7 op LW" })).toBeVisible();
    expect(pitch.getAllByRole("button", { name: / op / })).toHaveLength(11);
    for (const name of ["Macéo 16", "Krijn 10", "Lukas 14"]) {
      expect(pitch.getByRole("button", { name })).toBeVisible();
    }
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    expect(eventRows()).toHaveLength(1);
    expect(eventRows()[0]).toHaveTextContent("10:00Tygo 11 ↔ Lucas 7");
    await user.click(screen.getByRole("button", { name: "Plan & werkelijk" }));
    expect(comparisonRows()).toEqual(before);
  });

  it("previews and confirms a live formation without rewriting minutes or the approved starting plan", async () => {
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    await startAtTenMinutes(user);
    await user.click(screen.getByRole("button", { name: "Plan & werkelijk" }));
    const before = comparisonRows();
    await user.click(screen.getByRole("button", { name: "Veld & wissels" }));

    await user.selectOptions(screen.getByRole("combobox", { name: "Formatie" }), "4-4-2");
    expect(screen.getByText("Voorbeeld 4-4-2 · nog niet toegepast")).toBeVisible();
    expect(screen.getByRole("button", { name: "Tygo 11 op RM" })).toBeDisabled();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuleren" }));
    expect(screen.getByRole("button", { name: "Tygo 11 op LW" })).toBeEnabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Formatie" }), "4-4-2");
    await user.click(screen.getByRole("button", { name: "Formatie toepassen om 10:00" }));
    expect(screen.getByRole("button", { name: "Tygo 11 op RM" })).toBeEnabled();
    expect(screen.queryByText("Voorbeeld 4-4-2 · nog niet toegepast")).not.toBeInTheDocument();
    expect(eventRows()).toHaveLength(1);
    expect(eventRows()[0]).toHaveTextContent("10:00Formatie → 4-4-2");

    await user.click(screen.getByRole("button", { name: "Bron controleren" }));
    expect(screen.getByText(/Beginformatie van het plan:/)).toHaveTextContent("4-3-3 (uit foto)");
    expect(screen.getByText(/Tygo 11 \(LW\)/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Plan & werkelijk" }));
    expect(comparisonRows()).toEqual(before);
  });

  it("executes a single planned substitution and then only the remainder of its group", async () => {
    const user = userEvent.setup();
    render(<SubstitutionDemo />);
    await startAtTenMinutes(user);

    await user.click(screen.getByRole("button", { name: "Voer wissel uit: Revi 5 eruit, Macéo 16 erin" }));
    expect(screen.getByRole("button", { name: "Macéo 16 op RW" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sem 15 op CM" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Krijn 10" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Voer wissel uit: Revi 5 eruit, Macéo 16 erin" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voer wissel uit: Sem 15 eruit, Krijn 10 erin" })).toBeEnabled();
    expect(eventRows()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Uitvoeren om 10:00" }));
    expect(screen.getByRole("button", { name: "Krijn 10 op CM" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sem 15" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Macéo 16 op RW" })).toBeVisible();
    expect(screen.getByText("Gepland 20′")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const events = eventRows();
    expect(events).toHaveLength(2);
    expect(events.filter((event) => event.textContent?.includes("Revi 5 → Macéo 16"))).toHaveLength(1);
    expect(events.filter((event) => event.textContent?.includes("Sem 15 → Krijn 10"))).toHaveLength(1);
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
  });
});
