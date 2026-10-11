import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FieldPlayerCard } from "./FieldPlayerCard";

const cardProps = { name: "Jan Jansen", number: 7, position: "ST", x: 50, y: 50,
  isSelected: false, isDimmed: false, isEmpty: false, onClick: () => undefined };

describe("FieldPlayerCard FC selection", () => {
  it("keeps selection, discipline and coach minutes on a keyboard-operable shield", () => {
    const click = vi.fn();
    render(<FieldPlayerCard {...cardProps} useFcShield isSelected disciplineBadge="red" seasonMinutes={42} onClick={click} />);
    const button = screen.getByRole("button", { name: "Jan 7" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: /Rode kaart/ })).toBeInTheDocument();
    expect(screen.getByText("42′")).toBeInTheDocument();
    fireEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
  });

  it("does not force FC cards on ordinary teams", () => {
    render(<FieldPlayerCard {...cardProps} />);
    expect(screen.queryByRole("img", { name: /Algemeen|beoordeeld/ })).not.toBeInTheDocument();
    expect(screen.getByText("Jan")).toBeInTheDocument();
  });
});
