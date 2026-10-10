import { describe, expect, it, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDeviceSurface } from "./useDeviceSurface";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

describe("useDeviceSurface", () => {
  afterEach(() => {
    setViewport(1024, 768);
  });

  it("starts mobile then upgrades an iPad viewport to pc", () => {
    setViewport(744, 1133);
    const { result } = renderHook(() => useDeviceSurface());
    expect(result.current).toBe("pc");
  });

  it("stays mobile on a landscape phone", () => {
    setViewport(844, 390);
    const { result } = renderHook(() => useDeviceSurface());
    expect(result.current).toBe("mobile");
  });

  it("updates after resize", () => {
    setViewport(390, 844);
    const { result } = renderHook(() => useDeviceSurface());
    expect(result.current).toBe("mobile");
    act(() => {
      setViewport(1024, 768);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe("pc");
  });
});
