import { describe, expect, it } from "vitest";
import { isPcViewport, surfaceFromViewport } from "./deviceSurface";

describe("isPcViewport", () => {
  it("treats iPhone portrait and landscape as phone", () => {
    expect(isPcViewport(390, 844)).toBe(false);
    expect(isPcViewport(844, 390)).toBe(false);
  });

  it("treats iPad mini and full iPad as PC", () => {
    expect(isPcViewport(744, 1133)).toBe(true);
    expect(isPcViewport(768, 1024)).toBe(true);
    expect(isPcViewport(1024, 768)).toBe(true);
  });

  it("treats a laptop as PC", () => {
    expect(isPcViewport(1280, 800)).toBe(true);
  });

  it("rejects invalid sizes", () => {
    expect(isPcViewport(0, 800)).toBe(false);
    expect(isPcViewport(Number.NaN, 800)).toBe(false);
  });
});

describe("surfaceFromViewport", () => {
  it("maps phone to mobile and iPad to pc", () => {
    expect(surfaceFromViewport(390, 844)).toBe("mobile");
    expect(surfaceFromViewport(744, 1133)).toBe("pc");
  });
});
