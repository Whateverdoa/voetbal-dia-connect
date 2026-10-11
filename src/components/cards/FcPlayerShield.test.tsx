import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardRecognition, FcRatings } from "@/lib/cards/fc27";
import { FcPlayerShield } from "./FcPlayerShield";

const ratings: FcRatings = { snl: 81, sch: 84, pas: 79, dri: 82, vrd: 61, fys: 73 };
const start = Date.UTC(2026, 9, 11, 12);
const award = (kind: "week" | "month", expiresAt: number): CardRecognition => ({
  roundId: kind, kind, periodKey: "2026-10", publishedAt: start - 1000, expiresAt,
});

afterEach(() => vi.useRealTimers());

describe("FcPlayerShield", () => {
  it("displays the rounded mean of all six scores and keeps unknown ratings empty", () => {
    const { rerender } = render(<FcPlayerShield name="Jan" position="ST" fcRatings={ratings} />);
    expect(screen.getByRole("img", { name: /Jan · ST · Algemeen 77/ })).toBeInTheDocument();
    for (const label of ["SNL", "SCH", "PAS", "DRI", "VRD", "FYS"]) expect(screen.getByText(label)).toBeInTheDocument();
    rerender(<FcPlayerShield name="J." fcRatings={null} />);
    expect(screen.getByRole("img", { name: /J. · Nog niet beoordeeld/ })).toBeInTheDocument();
    expect(screen.queryByText("77")).not.toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(8);
  });

  it("automatically falls from month to week to base without stacking bonuses or refreshing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    render(<FcPlayerShield name="Jan" fcRatings={ratings} recognitions={[award("month", start + 1000), award("week", start + 2000)]} />);
    expect(screen.getByRole("img", { name: /Algemeen 82 · Team van de maand/ })).toHaveAttribute("data-card-kind", "month");
    act(() => vi.advanceTimersByTime(1001));
    expect(screen.getByRole("img", { name: /Algemeen 79 · Team van de week/ })).toHaveAttribute("data-card-kind", "week");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("img", { name: /Algemeen 77/ })).toHaveAttribute("data-card-kind", "base");
    expect(screen.queryByText(/TEAM VAN DE/)).not.toBeInTheDocument();
  });

  it("resolves an expired award when a sleeping tab regains focus", () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    render(<FcPlayerShield name="Jan" fcRatings={ratings} recognitions={[award("week", start + 1000)]} compact />);
    expect(screen.getByRole("img", { name: /Team van de week/ })).toBeInTheDocument();
    vi.setSystemTime(start + 5000);
    fireEvent.focus(window);
    expect(screen.getByRole("img", { name: /Algemeen 77/ })).toHaveAttribute("data-card-kind", "base");
  });

  it("caps boosted scores and the recalculated overall at 99", () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    const high = { snl: 99, sch: 98, pas: 97, dri: 98, vrd: 99, fys: 98 };
    render(<FcPlayerShield name="Jan" fcRatings={high} recognitions={[award("month", start + 1000)]} />);
    expect(screen.getByRole("img", { name: /Algemeen 99/ })).toBeInTheDocument();
    expect(screen.getAllByText("99")).toHaveLength(7);
  });

  it("uses separate vector IDs for cards and an integrated portrait", () => {
    const { container } = render(<><FcPlayerShield name="Jan" photoUrl="https://example.test/jan.jpg" /><FcPlayerShield name="Piet" /></>);
    const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(container.querySelector('image[href="https://example.test/jan.jpg"]')).toHaveAttribute("mask");
    expect(container.querySelector('image[href="/logos/dia.png"]')).toBeInTheDocument();
  });

  it("keeps compact phone identity and discipline readable without scaling their text", () => {
    const { container } = render(<FcPlayerShield name="Jan" number={7} position="ST" fcRatings={ratings} compact width={48} disciplineBadge="red" />);
    expect(screen.getByText("Jan")).toHaveStyle({ fontSize: "9px" });
    expect(screen.getByText("7")).toHaveStyle({ fontSize: "11px" });
    expect(screen.getByText("ST")).toHaveStyle({ fontSize: "8px" });
    expect(screen.getByTitle("Rode kaart")).toHaveStyle({ width: "9px", height: "13px" });
    expect(screen.queryByText("SNL")).not.toBeInTheDocument();
    expect(container.querySelector("svg text")).toBeNull();
  });
});
