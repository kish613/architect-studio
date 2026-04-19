import { describe, it, expect } from "vitest";
import { cutYToWallMode, wallModeToCutY } from "../section-cut";

describe("section-cut mapping", () => {
  it("maps 0..1/3 to 'up'", () => {
    expect(cutYToWallMode(0)).toBe("up");
    expect(cutYToWallMode(0.2)).toBe("up");
  });
  it("maps 1/3..2/3 to 'cutaway'", () => {
    expect(cutYToWallMode(0.5)).toBe("cutaway");
    expect(cutYToWallMode(0.4)).toBe("cutaway");
  });
  it("maps >= 2/3 to 'down'", () => {
    expect(cutYToWallMode(0.9)).toBe("down");
    expect(cutYToWallMode(1)).toBe("down");
  });
  it("reverse maps wall modes to canonical cutY", () => {
    expect(wallModeToCutY("up")).toBe(0);
    expect(wallModeToCutY("cutaway")).toBe(0.5);
    expect(wallModeToCutY("down")).toBe(1);
  });
});
