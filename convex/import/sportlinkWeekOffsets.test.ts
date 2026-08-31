import { describe, expect, it } from "vitest";
import {
  programmaPastWeekOffsets,
  programmaWeekOffsets,
  uitslagenWeekOffsets,
} from "./sportlinkWeekOffsets";

describe("sportlinkWeekOffsets", () => {
  it("starts programma at the current week", () => {
    expect(programmaWeekOffsets(2)).toEqual([0, 1, 2]);
  });

  it("fetches recent past programma weeks for gestaakt leftovers", () => {
    expect(programmaPastWeekOffsets(2)).toEqual([-1, -2]);
  });

  it("includes current-week uitslagen so today's official scores are fetched", () => {
    expect(uitslagenWeekOffsets(3)).toEqual([0, -1, -2, -3]);
  });
});
