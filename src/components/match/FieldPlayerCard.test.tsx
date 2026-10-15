import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FieldPlayerCard } from "./FieldPlayerCard";

const props = {
  playerId: "player-7", name: "Sam Example", number: 7, position: "CM",
  x: 50, y: 50, isSelected: false, isDimmed: false, isEmpty: false,
};

describe("FieldPlayerCard identity and keyboard controls", () => {
  it("keeps name and number visible and identity stable when labels change", () => {
    const { rerender } = render(<FieldPlayerCard {...props} onClick={vi.fn()} />);
    const card = screen.getByTestId("field-player-player-7");
    expect(within(card).getByText("Sam")).toBeInTheDocument();
    expect(within(card).getByText("7")).toBeInTheDocument();
    rerender(<FieldPlayerCard {...props} name="Samuel Example" onClick={vi.fn()} />);
    expect(screen.getByTestId("field-player-player-7")).toBe(card);
    expect(within(card).getByText("Samuel")).toBeInTheDocument();
  });

  it("activates an interactive card once with Enter or Space and exposes selection", () => {
    const onClick = vi.fn();
    render(<FieldPlayerCard {...props} interactive isSelected onClick={onClick} />);
    const card = screen.getByRole("button", { name: "Sam, nummer 7" });
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(card, { key: "ArrowRight" });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does not expose presentation-only cards as keyboard controls", () => {
    const onClick = vi.fn();
    render(<FieldPlayerCard {...props} onClick={onClick} />);
    expect(screen.queryByRole("button")).toBeNull();
    const card = screen.getByTestId("field-player-player-7");
    expect(card).not.toHaveAttribute("tabindex");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).not.toHaveBeenCalled();
  });
});
