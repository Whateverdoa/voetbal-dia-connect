import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emptyPlayerReview,
  MAX_PLAYER_REVIEW_ANSWER_LENGTH,
  PLAYER_REVIEW_QUESTIONS,
  type PlayerReview,
  type PlayerReviewQuestionId,
} from "@/lib/team-portal/playerReview";
import { PlayerReviewForm, PlayerReviewReportView, type PlayerReviewFormProps } from "./PlayerReviewForm";

afterEach(cleanup);

const player = { id: "p1", name: "Milan", number: 8 };

function completeReview(): PlayerReview {
  return {
    ...emptyPlayerReview(),
    positiveMoment: { text: "Je speelde in de tweede helft een mooie pass naar de vrije vleugel.", notObserved: false },
    teamwork: { text: "Je hielp Sam overeind na een duel.", notObserved: false },
    nextStep: { text: "Kijk voor je aanname over je schouder.", notObserved: false },
  };
}

function questionLabel(id: PlayerReviewQuestionId) {
  const question = PLAYER_REVIEW_QUESTIONS.find((entry) => entry.id === id);
  if (!question) throw new Error(`Missing question ${id}`);
  return question.label;
}

function Harness({
  initialAnswers = emptyPlayerReview(),
  ...props
}: Omit<PlayerReviewFormProps, "answers" | "onChange"> & { initialAnswers?: PlayerReview }) {
  const [answers, setAnswers] = useState(initialAnswers);
  return <PlayerReviewForm {...props} answers={answers} onChange={setAnswers} />;
}

describe("PlayerReviewForm", () => {
  it("omits a missing shirt number instead of showing a placeholder identifier", () => {
    render(<Harness player={{ ...player, number: null }} onSave={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Even terugkijken met Milan" })).toBeVisible();
    expect(screen.queryByText(/#null|#undefined/)).not.toBeInTheDocument();
  });

  it("starts with three core questions and allows an incomplete draft to be saved", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness player={player} onSave={onSave} storageNote="Alleen bewaard in deze demo." />);

    expect(screen.getByRole("form", { name: /Even terugkijken met Milan/ })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveTextContent("0 van 3 kernvragen ingevuld");
    expect(screen.getByRole("button", { name: "Bekijk conceptverslag" })).toBeDisabled();
    expect(screen.getByText("Alleen bewaard in deze demo.")).toBeVisible();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Concept bewaren" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("offers two extra questions and preserves answers when they are collapsed", async () => {
    const user = userEvent.setup();
    render(<Harness player={player} onSave={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Twee extra vragen: met en zonder bal" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(5);
    fireEvent.change(screen.getByRole("textbox", { name: questionLabel("onBall") }), { target: { value: "Je hield de bal dicht bij je voet." } });
    await user.click(screen.getByRole("button", { name: "Verberg de twee extra vragen" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Twee extra vragen: met en zonder bal" }));
    expect(screen.getByRole("textbox", { name: questionLabel("onBall") })).toHaveValue("Je hield de bal dicht bij je voet.");
  });

  it("treats not observed as a deliberate answer and excludes retained text from the report", async () => {
    const user = userEvent.setup();
    const review = completeReview();
    render(<Harness player={player} initialAnswers={review} onSave={vi.fn()} />);
    await user.click(screen.getByRole("checkbox", { name: `${questionLabel("teamwork")}: niet goed kunnen zien` }));

    expect(screen.getByRole("textbox", { name: questionLabel("teamwork") })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("3 van 3 kernvragen ingevuld");
    await user.click(screen.getByRole("button", { name: "Bekijk conceptverslag" }));
    const preview = within(screen.getByRole("region", { name: "Conceptverslag om samen te bespreken" }));
    expect(preview.getByText(review.positiveMoment.text)).toBeInTheDocument();
    expect(preview.queryByText(review.teamwork.text)).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: `${questionLabel("teamwork")}: niet goed kunnen zien` }));
    expect(screen.getByRole("textbox", { name: questionLabel("teamwork") })).toHaveValue(review.teamwork.text);
    expect(preview.getByText(review.teamwork.text)).toBeInTheDocument();
  });

  it("requires reviewing the preview before sharing and revokes that confirmation after an edit", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    render(<Harness player={player} initialAnswers={completeReview()} onSave={vi.fn()} onPublish={onPublish} />);

    expect(screen.queryByRole("button", { name: "Verslag delen" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bekijk conceptverslag" }));
    expect(screen.getByRole("button", { name: "Verslag delen" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Ik heb het verslag nagelezen." }));
    await user.click(screen.getByRole("button", { name: "Verslag delen" }));
    expect(onPublish).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByRole("textbox", { name: questionLabel("nextStep") }), { target: { value: "Oefen eerst rustig kijken, dan aannemen." } });
    expect(screen.getByRole("checkbox", { name: "Ik heb het verslag nagelezen." })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Verslag delen" })).toBeDisabled();
    expect(within(screen.getByRole("region", { name: "Conceptverslag om samen te bespreken" })).getByText("Oefen eerst rustig kijken, dan aannemen.")).toBeInTheDocument();
  });

  it("honors the parent's save and publish gates even after the preview has been reviewed", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onPublish = vi.fn();
    render(<Harness player={player} initialAnswers={completeReview()} onSave={onSave} onPublish={onPublish} saveDisabled publishDisabled />);

    expect(screen.getByRole("button", { name: "Concept bewaren" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: /Even terugkijken met Milan/ }));
    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Bekijk conceptverslag" }));
    await user.click(screen.getByRole("checkbox", { name: "Ik heb het verslag nagelezen." }));
    expect(screen.getByRole("button", { name: "Verslag delen" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Verslag delen" }));
    expect(onPublish).not.toHaveBeenCalled();
  });

  it("shows recorded events and zero minutes as memory aids without pre-filling judgments", () => {
    render(<Harness player={player} onSave={vi.fn()} minutesPlayed={0} recordedMoments={[{ id: "event-1", label: "12′ · Doelpunt", text: "Assist bij het doelpunt van Sam." }]} />);

    const memory = within(screen.getByRole("complementary", { name: "Terug naar de wedstrijd" }));
    expect(memory.getByText("Geregistreerde speeltijd: 0 min")).toBeInTheDocument();
    expect(memory.getByText("12′ · Doelpunt")).toBeInTheDocument();
    expect(memory.getByText("Assist bij het doelpunt van Sam.")).toBeInTheDocument();
    expect(memory.getByText(/geen beoordeling/)).toBeInTheDocument();
    screen.getAllByRole("textbox").forEach((input) => expect(input).toHaveValue(""));
    expect(screen.getByRole("status")).toHaveTextContent("0 van 3 kernvragen ingevuld");
  });

  it("shows existing optional observations immediately and labels malformed oversized answers", () => {
    const review = completeReview();
    review.onBall = { text: "Langs de zijlijn hield je de bal binnen.", notObserved: false };
    review.positiveMoment.text = "a".repeat(MAX_PLAYER_REVIEW_ANSWER_LENGTH + 1);
    render(<Harness player={player} initialAnswers={review} onSave={vi.fn()} />);

    expect(screen.getAllByRole("textbox")).toHaveLength(5);
    expect(screen.getByRole("textbox", { name: questionLabel("positiveMoment") })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("button", { name: "Concept bewaren" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bekijk conceptverslag" })).toBeDisabled();
  });

  it("hides the sharing action completely for a form with no publication capability", async () => {
    const user = userEvent.setup();
    render(<Harness player={player} initialAnswers={completeReview()} onSave={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Bekijk conceptverslag" }));
    expect(screen.queryByRole("button", { name: "Verslag delen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Ik heb het verslag nagelezen." })).not.toBeInTheDocument();
  });

  it("keeps a review with no observed moments as a draft instead of inventing a report", () => {
    const review = emptyPlayerReview();
    review.positiveMoment.notObserved = true;
    review.teamwork.notObserved = true;
    review.nextStep.notObserved = true;
    render(<Harness player={player} initialAnswers={review} onSave={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("3 van 3 kernvragen ingevuld");
    expect(screen.getByRole("button", { name: "Bekijk conceptverslag" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Concept bewaren" })).toBeEnabled();
    expect(screen.getByText(/Nog geen concrete observatie\? Bewaar dit als concept\./)).toBeVisible();
  });
});

describe("PlayerReviewReportView", () => {
  it("renders only observed answer text and never creates a rating or extra conclusions", () => {
    const review = completeReview();
    review.teamwork.notObserved = true;
    render(<PlayerReviewReportView review={review} />);

    expect(screen.getByText(review.positiveMoment.text)).toBeInTheDocument();
    expect(screen.getByText(review.nextStep.text)).toBeInTheDocument();
    expect(screen.queryByText(review.teamwork.text)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
