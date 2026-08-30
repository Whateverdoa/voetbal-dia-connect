import { describe, expect, it } from "vitest";
import {
  cardNameLines,
  firstNameOf,
  formatCardName,
  formatFieldLabel,
} from "./formatCardName";

describe("formatCardName", () => {
  it("uses first name only in first mode", () => {
    expect(formatCardName("Jan Jansen", "first")).toBe("JAN");
  });

  it("keeps the full name in full mode", () => {
    expect(formatCardName("Jan Jansen", "full")).toBe("Jan Jansen");
  });

  it("leaves initials intact", () => {
    expect(formatCardName("JJ", "first")).toBe("JJ");
    expect(formatCardName("JJ", "full")).toBe("JJ");
  });

  it("takes the first name without uppercasing", () => {
    expect(firstNameOf("Jan Jansen")).toBe("Jan");
  });

  it("puts the number after the first name", () => {
    expect(formatFieldLabel("Jan Jansen", 7)).toBe("Jan 7");
    expect(formatFieldLabel("Jan Jansen", null)).toBe("Jan");
  });
});

describe("cardNameLines", () => {
  it("keeps short full names on one line", () => {
    expect(cardNameLines("Jan Jansen", "full")).toEqual(["Jan Jansen"]);
  });

  it("splits longer Dutch names after the first word", () => {
    expect(cardNameLines("Jan van der Berg", "full")).toEqual([
      "Jan",
      "van der Berg",
    ]);
  });
});
