import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { DEMO_PLAN } from "@/lib/substitutions/demoPlan";
import {
  advanceDemoClock,
  changeDemoFormation,
  createDemoMatch,
  executeDemoStep,
  skipDemoStep,
  startDemoClock,
  swapDemoPlayerPositions,
} from "@/lib/substitutions/demoMatch";
import { getDemoFormation } from "@/lib/substitutions/demoFormations";
import { SubstitutionPrint } from "./SubstitutionPrint";

afterEach(cleanup);

describe("substitution print output", () => {
  it("prints six planned field states on one concept A4 before the demo starts", () => {
    const match = createDemoMatch(DEMO_PLAN);
    const { container } = render(<SubstitutionPrint match={match} plan={DEMO_PLAN} approved={false} printMode="plan" />);
    expect(container.querySelectorAll(".substitution-print-page")).toHaveLength(1);
    const frames = [...container.querySelectorAll(".substitution-print-frame")];
    expect(frames).toHaveLength(6);
    expect(container).toHaveTextContent("CONCEPT · Nog niet bevestigd");
    expect(frames.map((frame) => frame.querySelector("figcaption")?.textContent)).toEqual([
      "00:00 · Beginopstelling", "10:00 · Geplande wissel", "20:00 · Geplande wissel",
      "30:00 · Geplande wissel", "40:00 · Geplande wissel", "50:00 · Geplande wissel",
    ]);
    expect(frames[0].querySelector(".substitution-print-bench")).toHaveTextContent("Macéo 16 · Krijn 10 · Lukas 14");
    for (const player of ["Revi 5", "Sem 15", "Lukas 14"]) expect(frames[1].querySelector(".substitution-print-bench")).toHaveTextContent(player);
    expect(frames[5]).toHaveTextContent("Positie: Sem 15 ↔ Olivier 9");
    expect(match.phase).toBe("ready");
    expect(match.events).toHaveLength(0);
  });

  it("prints actual snapshots at their execution times and excludes skipped plans and future steps", () => {
    let match = advanceDemoClock(startDemoClock(createDemoMatch(DEMO_PLAN)), 12 * 60);
    match = executeDemoStep(match, "m10");
    match = skipDemoStep(match, "m20");
    match = changeDemoFormation(match, getDemoFormation("4-4-2"));
    const { container } = render(<SubstitutionPrint match={match} plan={DEMO_PLAN} approved printMode="actual" />);
    const frames = [...container.querySelectorAll(".substitution-print-frame")];
    expect(frames).toHaveLength(3);
    expect(frames[1].querySelector("figcaption")).toHaveTextContent("12:00 · WisselPlan: 10:00");
    for (const player of ["Revi 5", "Sem 15", "Lukas 14"]) expect(frames[1].querySelector(".substitution-print-bench")).toHaveTextContent(player);
    expect(frames[1].querySelector("svg")?.textContent).toContain("Tygo 11, LW");
    expect(frames[2].querySelector("svg")?.textContent).toContain("Tygo 11, RM");
    expect(container).toHaveTextContent("1 gepland wisselmoment overgeslagen");
    expect(container).not.toHaveTextContent("20:00 · Wissel");
    expect(container).not.toHaveTextContent("Geplande wissel");
  });

  it("moves additional actual field changes to a second A4 while preserving chronological states", () => {
    let match = startDemoClock(createDemoMatch(DEMO_PLAN));
    for (let index = 0; index < 6; index += 1) {
      match = advanceDemoClock(match, 60);
      match = swapDemoPlayerPositions(match, "tygo", "lucas");
    }
    const { container } = render(<SubstitutionPrint match={match} plan={DEMO_PLAN} approved printMode="actual" />);
    const pages = [...container.querySelectorAll(".substitution-print-page")];
    expect(pages).toHaveLength(2);
    expect(pages[0].querySelectorAll(".substitution-print-frame")).toHaveLength(6);
    expect(pages[1].querySelectorAll(".substitution-print-frame")).toHaveLength(1);
    expect(pages[1].querySelector("figcaption")).toHaveTextContent("06:00 · Positieruil");
    expect(pages[1]).toHaveTextContent("Blad 2 / 2 · 06:00");
    expect(pages[0].querySelectorAll("svg")[1]?.textContent).toContain("Tygo 11, ST");
    expect(pages[1].querySelector("svg")?.textContent).toContain("Tygo 11, LW");
  });
});
