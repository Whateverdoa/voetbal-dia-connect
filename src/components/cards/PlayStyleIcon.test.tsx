import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PLAY_STYLES } from "@/lib/cards/fc27";
import { PlayStyleIcon } from "./PlayStyleIcon";

describe("PlayStyleIcon", () => {
  it("exposes the catalog's Dutch names and distinct original action glyphs", () => {
    const { container } = render(<>{PLAY_STYLES.map((style) => <PlayStyleIcon key={style.id} styleId={style.id} />)}</>);
    for (const style of PLAY_STYLES) expect(screen.getByRole("img", { name: style.name })).toBeInTheDocument();
    const glyphs = [...container.querySelectorAll("svg > g")].map((node) => node.innerHTML);
    expect(new Set(glyphs).size).toBe(PLAY_STYLES.length);
  });

  it("hides decorative glyphs and handles unknown IDs safely", () => {
    const { rerender } = render(<PlayStyleIcon styleId="placed_ball" decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    rerender(<PlayStyleIcon styleId="unknown" />);
    expect(screen.getByRole("img", { name: "Voetbal" })).toBeInTheDocument();
  });
});
