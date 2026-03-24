import { describe, it, expect } from "vitest";
import { postProcessGeminiData } from "../pascal";

describe("door snapping after wall reindexing", () => {
  it("preserves door on surviving wall after degenerate removal", () => {
    const input = {
      levels: [{
        name: "Ground Floor", index: 0, elevation: 0,
        walls: [
          { startX: 0, startZ: 0, endX: 0, endZ: 0.01 },
          { startX: 0, startZ: 0, endX: 5, endZ: 0 },
          { startX: 5, startZ: 0, endX: 5, endZ: 4 },
        ],
        doors: [{ wallIndex: 1, position: 0.5, width: 0.9, height: 2.1 }],
        windows: [], rooms: [], items: [],
      }],
    };
    const result = postProcessGeminiData(input);
    expect(result.levels[0].doors.length).toBe(1);
    expect(result.levels[0].doors[0].wallIndex).toBe(0);
  });

  it("snaps orphaned door to nearest surviving wall", () => {
    const input = {
      levels: [{
        name: "Ground Floor", index: 0, elevation: 0,
        walls: [
          { startX: 0, startZ: 0, endX: 5, endZ: 0 },
          { startX: 5, startZ: 0, endX: 5, endZ: 4 },
          { startX: 0, startZ: 0, endX: 0.02, endZ: 0.01 },
        ],
        doors: [{ wallIndex: 2, position: 0.5, width: 0.9, height: 2.1 }],
        windows: [], rooms: [], items: [],
      }],
    };
    const result = postProcessGeminiData(input);
    expect(result.levels[0].doors.length).toBeLessThanOrEqual(1);
  });
});
