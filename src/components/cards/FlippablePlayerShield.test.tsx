import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlippablePlayerShield } from "./FlippablePlayerShield";

describe("FlippablePlayerShield", () => {
  it("removes the printed number, exposes only the active face and turns back", () => {
    const { container } = render(<FlippablePlayerShield name="Jan" number={7} position="CM" playStyleIds={["dribbler"]} />);
    const button = screen.getByRole("button", { name: "Kaart van Jan omdraaien" });
    expect(container.querySelector('[data-player-shirt] text')).toBeNull();
    expect(screen.queryByRole("group", { name: "Achterkant van Jan" })).toBeNull();
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    const back = screen.getByRole("group", { name: "Achterkant van Jan" });
    expect(within(back).getByText("Rugnummer")).toBeVisible();
    expect(within(back).getByText("7")).toBeVisible();
    expect(within(back).getByText("CM")).toBeVisible();
    expect(within(back).getByText("Dribbelaar")).toBeVisible();
    expect(screen.queryByRole("img", { name: /Jan · CM/ })).toBeNull();
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(screen.queryByRole("group", { name: "Achterkant van Jan" })).toBeNull();
    expect(screen.getByRole("img", { name: /Jan · CM/ })).toBeVisible();
  });

  it("updates the back immediately when permitted data is withdrawn and leaves unknown fields empty", () => {
    const { rerender } = render(<FlippablePlayerShield name="Jan" number={7} position="CM" playStyleIds={["dribbler"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Kaart van Jan omdraaien" }));
    rerender(<FlippablePlayerShield name="J." number={null} position={null} playStyleIds={[]} />);
    const back = screen.getByRole("group", { name: "Achterkant van J." });
    expect(within(back).queryByText("Dribbelaar")).toBeNull();
    expect(within(back).getByText("Nog niet toegekend")).toBeVisible();
    expect(within(back).getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText("7")).toBeNull();
  });
});
