import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubstitutionWorkspace } from "./SubstitutionWorkspace";

afterEach(cleanup);

type User = ReturnType<typeof userEvent.setup>;

async function approveAppSource(user: User) {
  await user.click(screen.getByRole("button", { name: "Bron controleren" }));
  await user.click(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, aanwezigheid, opstelling en wissels van deze appkopie/ }));
  await user.click(screen.getByRole("button", { name: "Plan goedkeuren en proberen" }));
  expect(screen.getByRole("button", { name: "Start demo" })).toBeEnabled();
  // Source-isolation scenarios retain explicit control over when each group runs.
  await user.click(screen.getByRole("checkbox", { name: "Wissels automatisch volgens plan" }));
}

async function selectGilze(user: User) {
  await user.selectOptions(screen.getByRole("combobox", { name: "Wedstrijd / voorbeeld" }), "gilze-2026-10-03");
}

function assertLuukUnavailable(injured = true) {
  const unavailable = screen.getByLabelText("Niet beschikbaar");
  expect(unavailable).toBeVisible();
  expect(unavailable).toHaveTextContent("Luuk 4");
  if (injured) expect(unavailable).toHaveTextContent(/geblesseerd/i);
}

function assertGilzeStartingPitch() {
  const pitch = within(screen.getByRole("region", { name: "Actuele opstelling" }));
  for (const name of [
    "Luc 1 op GK", "Olivier 9 op CB", "Krijn 10 op CB", "Jody 2 op CB",
    "Maceo 16 op RWB", "Max 18 op CM", "Loek 17 op CAM", "Sem 15 op CM",
    "Tygo 11 op LWB", "Miloud 8 op ST", "Lukas 14 op ST",
  ]) expect(pitch.getByRole("button", { name })).toBeVisible();
  expect(pitch.getAllByRole("button", { name: / op / })).toHaveLength(11);
  for (const name of ["Revi 5", "Lucas 7", "Matteo 3"]) {
    expect(pitch.getByRole("button", { name })).toBeVisible();
  }
  expect(pitch.getAllByRole("button")).toHaveLength(14);
  expect(pitch.queryByRole("button", { name: "Luuk 4" })).not.toBeInTheDocument();
  assertLuukUnavailable();
}

function assertReeshofStartingPitch() {
  const pitch = within(screen.getByRole("region", { name: "Actuele opstelling" }));
  for (const name of [
    "Luc 1 op GK", "Maceo 16 op RB", "Olivier 9 op CB", "Max 18 op CB", "Jody 2 op LB",
    "Sem 15 op CDM", "Loek 17 op CM", "Krijn 10 op CM", "Miloud 8 op RW", "Lukas 14 op ST", "Tygo 11 op LW",
  ]) expect(pitch.getByRole("button", { name })).toBeVisible();
  expect(pitch.getAllByRole("button", { name: / op / })).toHaveLength(11);
  for (const name of ["Revi 5", "Lucas 7", "Matteo 3"]) {
    expect(pitch.getByRole("button", { name })).toBeVisible();
  }
  expect(pitch.getAllByRole("button")).toHaveLength(14);
  expect(pitch.queryByRole("button", { name: "Luuk 4" })).not.toBeInTheDocument();
  assertLuukUnavailable(false);
}

describe("substitution workspace sources", () => {
  it("opens Reeshof with the coach lineup, available Krijn and a fresh source review", async () => {
    const user = userEvent.setup();
    render(<SubstitutionWorkspace />);
    const sources = screen.getByRole("combobox", { name: "Wedstrijd / voorbeeld" });
    expect(sources).toHaveValue("reeshof-2026-10-10");
    expect(within(sources).getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("combobox", { name: "Beginopstelling" })).toHaveValue("app-reeshof-4-3-3");
    assertReeshofStartingPitch();
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    const source = within(screen.getByRole("complementary", { name: "Bron van de wedstrijd" }));
    expect(source.getByText(/SV Reeshof O13-1.*10 oktober 2026/)).toBeVisible();
    expect(source.getByText(/er wordt niets teruggeschreven/)).toBeVisible();
    await user.click(screen.getByText("Beginposities handmatig instellen", { exact: true }));
    expect(screen.queryAllByRole("option", { name: /Luuk/ })).toHaveLength(0);
    expect(screen.getAllByRole("option", { name: "Krijn 10" }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Plan controleren" }));
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, aanwezigheid, opstelling en wissels van deze appkopie/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Plan goedkeuren en proberen" })).toBeDisabled();
    expect(screen.queryByLabelText("Bronfoto kiezen")).not.toBeInTheDocument();
  });

  it("isolates Reeshof edits, approval and executed actions when changing sources", async () => {
    const user = userEvent.setup();
    render(<SubstitutionWorkspace />);
    await user.click(screen.getByRole("button", { name: "Bron controleren" }));
    const krijnName = screen.getByRole("textbox", { name: "Naam reeshof-p11" });
    await user.clear(krijnName);
    await user.type(krijnName, "Krijn lokaal");
    await approveAppSource(user);
    await user.click(screen.getByRole("button", { name: "Volgend moment" }));
    await user.click(screen.getByRole("button", { name: "Alle resterende om 10:00" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    const pitch = within(screen.getByRole("region", { name: "Actuele opstelling" }));
    expect(pitch.getByRole("button", { name: "Krijn lokaal 10 op CB" })).toBeVisible();
    expect(pitch.getByRole("button", { name: "Revi 5 op CM" })).toBeVisible();
    expect(pitch.getByRole("button", { name: "Lucas 7 op LW" })).toBeVisible();

    await selectGilze(user);
    assertGilzeStartingPitch();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    await user.selectOptions(screen.getByRole("combobox", { name: "Wedstrijd / voorbeeld" }), "reeshof-2026-10-10");
    assertReeshofStartingPitch();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bron controleren" }));
    expect(screen.getByRole("textbox", { name: "Naam reeshof-p11" })).toHaveValue("Krijn");
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, aanwezigheid, opstelling en wissels van deze appkopie/ })).not.toBeChecked();
  });

  it("prints the six Reeshof plan frames as a concept with the corrected forty-minute order", async () => {
    const user = userEvent.setup();
    render(<SubstitutionWorkspace />);
    const printing = within(screen.getByRole("region", { name: "Wisselblad afdrukken" }));
    expect(printing.getByRole("button", { name: /Wisselplan afdrukken · 1 A4/ })).toBeEnabled();
    await user.click(printing.getByText("Afdrukvoorbeeld", { exact: true }));
    expect(printing.getByText(/SV Reeshof O13-1.*10 oktober 2026/)).toBeVisible();
    expect(printing.getByText(/CONCEPT · Nog niet bevestigd/)).toBeVisible();
    const frames = printing.getAllByRole("figure");
    expect(frames).toHaveLength(6);
    for (const [index, minute] of ["00:00", "10:00", "20:00", "30:00", "40:00", "50:00"].entries()) {
      expect(frames[index]).toHaveTextContent(minute);
      expect(within(frames[index]).getByRole("img", { name: "Half veld met spelers, namen en rugnummers" })).toBeVisible();
      expect(frames[index]).not.toHaveTextContent("Luuk");
    }
    expect(frames[0]).toHaveTextContent("Krijn 10, CM");
    expect(frames[4]).toHaveTextContent("Jody 2, CB");
    expect(frames[4]).toHaveTextContent("Olivier 9, RB");
    expect(frames[5]).toHaveTextContent("Max 18, CM");
    expect(printing.getByText(/Niet beschikbaar.*Luuk 4/i)).toBeVisible();
    expect(printing.getByText("Blad 1 / 1 · 60 minuten")).toBeVisible();
  });

  it("opens the actual Gilze starting selection and requires explicit review of the local app copy", async () => {
    const user = userEvent.setup();
    render(<SubstitutionWorkspace />);
    await selectGilze(user);
    expect(screen.getByRole("combobox", { name: "Wedstrijd / voorbeeld" })).toHaveValue("gilze-2026-10-03");
    expect(screen.getByRole("combobox", { name: "Beginopstelling" })).toHaveValue("app-gilze-3-5-2");
    assertGilzeStartingPitch();
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    const source = within(screen.getByRole("complementary", { name: "Bron van de wedstrijd" }));
    expect(source.getByText(/DIA JO13-2 – Gilze O13-1/)).toBeVisible();
    expect(source.getByText(/2 oktober.*geblesseerd|geblesseerd.*2 oktober/i)).toBeVisible();
    expect(source.getByText(/er wordt niets teruggeschreven/)).toBeVisible();
    await user.click(screen.getByText("Beginposities handmatig instellen", { exact: true }));
    expect(screen.queryAllByRole("option", { name: /Luuk/ })).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Plan controleren" }));
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, aanwezigheid, opstelling en wissels van deze appkopie/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Plan goedkeuren en proberen" })).toBeDisabled();
    expect(screen.queryByLabelText("Bronfoto kiezen")).not.toBeInTheDocument();
    assertLuukUnavailable();
    const luukRow = screen.getByRole("textbox", { name: "Naam gilze-p07" }).closest("tr");
    if (!luukRow) throw new Error("Luuks selectieregel ontbreekt");
    expect(within(luukRow).getAllByRole("cell").at(-1)).toHaveTextContent("—");
  });

  it("switches to the photo example and back without carrying clock, lineup or approval across sources", async () => {
    const user = userEvent.setup();
    render(<SubstitutionWorkspace />);
    await selectGilze(user);
    await approveAppSource(user);
    await user.click(screen.getByRole("button", { name: "+1 minuut" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("01:00");
    const source = screen.getByRole("combobox", { name: "Wedstrijd / voorbeeld" });
    await user.selectOptions(source, "photo-example");

    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    const photoPitch = within(screen.getByRole("region", { name: "Actuele opstelling" }));
    expect(photoPitch.getByRole("button", { name: "Lucas 7 op ST" })).toBeVisible();
    expect(photoPitch.getByRole("button", { name: "Revi 5 op RW" })).toBeVisible();
    expect(photoPitch.getByRole("button", { name: "Macéo 16" })).toBeVisible();
    expect(photoPitch.queryByRole("button", { name: "Luuk 4" })).not.toBeInTheDocument();
    expect(photoPitch.getAllByRole("button")).toHaveLength(14);
    expect(screen.queryByLabelText("Niet beschikbaar")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bron controleren" }));
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, opstelling en wissels van dit voorbeeld/ })).not.toBeChecked();
    expect(screen.getByLabelText("Bronfoto kiezen")).toBeInTheDocument();

    await user.selectOptions(source, "gilze-2026-10-03");
    assertGilzeStartingPitch();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bron controleren" }));
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, aanwezigheid, opstelling en wissels van deze appkopie/ })).not.toBeChecked();
    assertLuukUnavailable();
  });

  it("executes the dependent ten-minute group in order and resets to the same unapproved Gilze source", async () => {
    const user = userEvent.setup();
    render(<SubstitutionWorkspace />);
    await selectGilze(user);
    await approveAppSource(user);
    await user.click(screen.getByRole("button", { name: "Volgend moment" }));
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("10:00");
    await user.click(screen.getByRole("button", { name: "Alle resterende om 10:00" }));

    const pitch = within(screen.getByRole("region", { name: "Actuele opstelling" }));
    // Both roles are CB: the coordinates distinguish the central slot 2 from right slot 1.
    expect(pitch.getByRole("button", { name: "Matteo 3 op CB" })).toHaveStyle({ left: "50%", top: "68%" });
    expect(pitch.getByRole("button", { name: "Krijn 10 op CB" })).toHaveStyle({ left: "80%", top: "68%" });
    expect(pitch.getByRole("button", { name: "Lucas 7 op CAM" })).toBeVisible();
    expect(pitch.getByRole("button", { name: "Luc 1 op GK" })).toBeVisible();
    for (const name of ["Revi 5", "Olivier 9", "Loek 17"]) {
      expect(pitch.getByRole("button", { name })).toBeVisible();
    }
    expect(pitch.getAllByRole("button")).toHaveLength(14);
    expect(pitch.queryByRole("button", { name: "Luuk 4" })).not.toBeInTheDocument();
    assertLuukUnavailable();
    await user.click(screen.getByText("Zelf een wissel kiezen", { exact: true }));
    expect(within(screen.getByRole("combobox", { name: "Speler erin" })).queryByRole("option", { name: /Luuk/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Gepland 20′")).toBeVisible();
    const history = screen.getByRole("heading", { name: "Geregistreerd in de demo" }).closest("section");
    if (!history) throw new Error("Gebeurtenissen ontbreken");
    const events = within(history).getAllByRole("listitem");
    expect(events).toHaveLength(1);
    expect(events[0]).toHaveTextContent("10:00Olivier 9 → Matteo 3 · Matteo 3 ↔ Krijn 10 · Loek 17 → Lucas 7");
    await user.click(screen.getByRole("button", { name: "Plan & werkelijk" }));
    assertLuukUnavailable();
    const comparison = screen.getByRole("heading", { name: "Het plan naast de uitvoering" }).closest("section");
    if (!comparison) throw new Error("Minutenvergelijking ontbreekt");
    expect(within(comparison).queryByRole("row", { name: /Luuk/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Demo opnieuw beginnen" }));
    expect(screen.getByRole("combobox", { name: "Wedstrijd / voorbeeld" })).toHaveValue("gilze-2026-10-03");
    assertGilzeStartingPitch();
    expect(screen.getByTestId("demo-clock")).toHaveTextContent("00:00");
    expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Geregistreerd in de demo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bron controleren" }));
    expect(screen.getByRole("checkbox", { name: /Ik heb namen, nummers, aanwezigheid, opstelling en wissels van deze appkopie/ })).not.toBeChecked();
    assertLuukUnavailable();
  });

  it("prepares six planned field frames on one labelled Gilze print sheet", async () => {
    const user = userEvent.setup();
    render(<SubstitutionWorkspace />);
    await selectGilze(user);
    const printing = within(screen.getByRole("region", { name: "Wisselblad afdrukken" }));
    expect(printing.getByRole("button", { name: /Wisselplan afdrukken · 1 A4/ })).toBeEnabled();
    await user.click(printing.getByText("Afdrukvoorbeeld", { exact: true }));
    expect(printing.getByRole("heading", { name: "DIA · Wisselplan" })).toBeVisible();
    expect(printing.getByText("DIA JO13-2 – Gilze O13-1 · 3 oktober 2026")).toBeVisible();
    expect(printing.getByText(/CONCEPT · Nog niet bevestigd/)).toBeVisible();
    const frames = printing.getAllByRole("figure");
    expect(frames).toHaveLength(6);
    for (const [index, minute] of ["00:00", "10:00", "20:00", "30:00", "40:00", "50:00"].entries()) {
      expect(frames[index]).toHaveTextContent(minute);
      expect(within(frames[index]).getByRole("img", { name: "Half veld met spelers, namen en rugnummers" })).toBeVisible();
      expect(frames[index]).not.toHaveTextContent("Luuk");
    }
    expect(printing.getByText(/Niet beschikbaar.*Luuk 4.*geblesseerd/i)).toBeVisible();
    expect(printing.getByText("Blad 1 / 1 · 60 minuten")).toBeVisible();
  });
});
