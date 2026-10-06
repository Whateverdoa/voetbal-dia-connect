import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { applyDemoCommand } from "@/lib/team-portal/commands";
import { createDemoState } from "@/lib/team-portal/fixtures";
import { emptyPlayerReview, type PlayerReview } from "@/lib/team-portal/playerReview";
import type { DemoActor, DemoState } from "@/lib/team-portal/types";
import { PublishedPlayerReviews } from "./PublishedPlayerReviews";

const NOW = 1800000000000;

function answers(moment: string): PlayerReview {
  return {
    ...emptyPlayerReview(),
    positiveMoment: { text: moment, notObserved: false },
    teamwork: { text: "Je hielp de speler naast je door aanspeelbaar te blijven.", notObserved: false },
    nextStep: { text: "Oefen om over je schouder te kijken voordat je de bal krijgt.", notObserved: false },
  };
}

function save(state: DemoState, playerId: string, content: PlayerReview, matchId = "m3", now = NOW) {
  return applyDemoCommand(state, { role: "coach" }, { type: "savePlayerReview", matchId, playerId, answers: content }, now);
}

function publish(state: DemoState, playerId: string, matchId = "m3", now = NOW + 1) {
  const review = state.playerReviews!.find((item) => item.playerId === playerId && item.matchId === matchId)!;
  return applyDemoCommand(state, { role: "coach" }, { type: "publishPlayerReview", reviewId: review.id }, now);
}

describe("published personal match reports", () => {
  it("shows the empty state while a coach has only saved a draft", () => {
    const state = save(createDemoState(NOW), "p1", answers("Alleen een concept voor Milan."));
    render(<PublishedPlayerReviews state={state} actor={{ role: "player", playerId: "p1" }} playerId="p1" />);
    expect(screen.getByText(/nog geen spelersverslag gedeeld/)).toBeInTheDocument();
    expect(screen.queryByText("Alleen een concept voor Milan.")).not.toBeInTheDocument();
  });

  it("keeps each child's publication separate in the two-child parent view", () => {
    let state = save(createDemoState(NOW), "p1", answers("Het persoonlijke moment van Milan."));
    state = publish(state, "p1");
    state = save(state, "p10", answers("Het persoonlijke moment van Isa."), "m3", NOW + 2);
    state = publish(state, "p10", "m3", NOW + 3);
    const actor: DemoActor = { role: "parent", guardianId: "family1" };
    const { rerender } = render(<PublishedPlayerReviews state={state} actor={actor} playerId="p1" />);
    expect(screen.getByText("Het persoonlijke moment van Milan.")).toBeInTheDocument();
    expect(screen.queryByText("Het persoonlijke moment van Isa.")).not.toBeInTheDocument();
    rerender(<PublishedPlayerReviews state={state} actor={actor} playerId="p10" />);
    expect(screen.getByText("Het persoonlijke moment van Isa.")).toBeInTheDocument();
    expect(screen.queryByText("Het persoonlijke moment van Milan.")).not.toBeInTheDocument();
  });

  it.each([
    { role: "player", playerId: "p2" },
    { role: "parent", guardianId: "unknown-family" },
    { role: "scout" },
  ] satisfies DemoActor[])("hides personal reports from an unauthorized actor: %j", (actor) => {
    const state = publish(save(createDemoState(NOW), "p1", answers("Dit verslag hoort alleen bij Milan.")), "p1");
    render(<PublishedPlayerReviews state={state} actor={actor} playerId="p1" />);
    expect(screen.queryByText("Dit verslag hoort alleen bij Milan.")).not.toBeInTheDocument();
    expect(screen.getByText(/nog geen spelersverslag gedeeld/)).toBeInTheDocument();
  });

  it("does not grant a linked parent access to a different teammate", () => {
    const state = publish(save(createDemoState(NOW), "p2", answers("Dit verslag hoort bij Noor.")), "p2");
    render(<PublishedPlayerReviews state={state} actor={{ role: "parent", guardianId: "family1" }} playerId="p2" />);
    expect(screen.queryByText("Dit verslag hoort bij Noor.")).not.toBeInTheDocument();
  });

  it("continues showing the published snapshot while a later draft changes", () => {
    let state = publish(save(createDemoState(NOW), "p1", answers("Het gedeelde moment.")), "p1");
    state = save(state, "p1", answers("De nog niet gedeelde aanvulling."), "m3", NOW + 2);
    render(<PublishedPlayerReviews state={state} actor={{ role: "player", playerId: "p1" }} playerId="p1" />);
    expect(screen.getByText("Het gedeelde moment.")).toBeInTheDocument();
    expect(screen.queryByText("De nog niet gedeelde aanvulling.")).not.toBeInTheDocument();
  });

  it("omits unobserved answer text and explains limited observation without a negative grade", () => {
    const content = answers("Je hielp een teamgenoot overeind.");
    content.teamwork = { text: "Onzekere herinnering die niet in het verslag mag.", notObserved: true };
    const state = publish(save(createDemoState(NOW), "p1", content), "p1");
    render(<PublishedPlayerReviews state={state} actor={{ role: "player", playerId: "p1" }} playerId="p1" />);
    expect(screen.getByText("Je hielp een teamgenoot overeind.")).toBeInTheDocument();
    expect(screen.queryByText("Onzekere herinnering die niet in het verslag mag.")).not.toBeInTheDocument();
    expect(screen.queryByText("Jouw bijdrage aan het team")).not.toBeInTheDocument();
    expect(screen.getByText(/geen negatieve beoordeling/)).toBeInTheDocument();
  });

  it("lists the latest publication first with the correct match context", () => {
    let state = publish(save(createDemoState(NOW), "p1", answers("Ouder verslag.")), "p1");
    state = save(state, "p1", answers("Nieuw verslag."), "m1", NOW + 2);
    state = publish(state, "p1", "m1", NOW + 3);
    render(<PublishedPlayerReviews state={state} actor={{ role: "player", playerId: "p1" }} playerId="p1" />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Tegen Groenwit JO13 · 3 – 2", "Tegen Duinrand JO13 · 4 – 1",
    ]);
  });
});
