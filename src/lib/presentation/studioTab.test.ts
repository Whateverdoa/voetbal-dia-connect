import { describe, expect, it } from "vitest";
import { parseStudioTab, studioTabToUrlParam } from "./studioTab";

describe("parseStudioTab", () => {
  it("maps opstelling and kleedkamer to the opstelling tab", () => {
    expect(parseStudioTab("opstelling", "kaarten")).toBe("kleedkamer");
    expect(parseStudioTab("kleedkamer", "kaarten")).toBe("kleedkamer");
  });

  it("keeps tactiek and remaps hidden spelerskaarten to opstelling", () => {
    expect(parseStudioTab("kaarten", "kleedkamer")).toBe("kleedkamer");
    expect(parseStudioTab("tactiek", "kaarten")).toBe("tactiek");
  });

  it("falls back for unknown or missing values", () => {
    expect(parseStudioTab(null, "kaarten")).toBe("kleedkamer");
    expect(parseStudioTab("wisselplan", "kleedkamer")).toBe("kleedkamer");
  });
});

describe("studioTabToUrlParam", () => {
  it("writes opstelling for the lineup tab", () => {
    expect(studioTabToUrlParam("kleedkamer")).toBe("opstelling");
    expect(studioTabToUrlParam("kaarten")).toBe("kaarten");
    expect(studioTabToUrlParam("tactiek")).toBe("tactiek");
  });
});
