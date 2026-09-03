import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useShowCardMinutes } from "./useShowCardMinutes";

describe("useShowCardMinutes", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to on", () => {
    const { result } = renderHook(() => useShowCardMinutes());
    expect(result.current[0]).toBe(true);
  });

  it("persists off in localStorage", () => {
    const { result } = renderHook(() => useShowCardMinutes());
    act(() => {
      result.current[1](false);
    });
    expect(window.localStorage.getItem("dia-show-card-minutes")).toBe("false");
    expect(result.current[0]).toBe(false);
  });
});
