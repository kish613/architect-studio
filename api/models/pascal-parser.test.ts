import { describe, expect, it } from "vitest";
import {
  buildSceneFromGemini,
  normalizeGeminiFloorplanData,
  parseGeminiFloorplanJson,
  summarizeSceneData,
  validateSceneData,
} from "../../lib/pascal.js";

describe("Pascal floorplan parsing", () => {
  it("accepts valid structured output and builds a scene", () => {
    const geminiData = parseGeminiFloorplanJson(
      JSON.stringify({
        levels: [
          {
            name: "Ground Floor",
            index: 0,
            elevation: 0,
            walls: [
              { startX: 0, startZ: 0, endX: 4, endZ: 0 },
              { startX: 4, startZ: 0, endX: 4, endZ: 3 },
            ],
            doors: [{ wallIndex: 0, position: 0.25 }],
            windows: [{ wallIndex: 1, position: 0.5 }],
            rooms: [{ name: "Living Room", zoneType: "living", points: [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }] }],
            items: [{ name: "Sofa", position: { x: 1.5, z: 1.2 } }],
          },
        ],
      })
    );

    const scene = validateSceneData(buildSceneFromGemini(geminiData));
    const summary = summarizeSceneData(scene);

    expect(summary.wallCount).toBe(2);
    expect(summary.doorCount).toBe(1);
    expect(summary.windowCount).toBe(1);
    expect(summary.zoneCount).toBe(1);
    expect(summary.itemCount).toBe(1);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseGeminiFloorplanJson("{ invalid json")).toThrow(/not valid JSON/i);
  });

  it("rejects empty structural output", () => {
    expect(() =>
      normalizeGeminiFloorplanData({
        levels: [
          {
            name: "Ground Floor",
            index: 0,
            elevation: 0,
            walls: [],
            doors: [],
            windows: [],
            rooms: [],
            items: [],
          },
        ],
      })
    ).toThrow(/did not contain any walls/i);
  });

  it("rejects invalid wall references", () => {
    expect(() =>
      normalizeGeminiFloorplanData({
        levels: [
          {
            name: "Ground Floor",
            index: 0,
            elevation: 0,
            walls: [{ startX: 0, startZ: 0, endX: 4, endZ: 0 }],
            doors: [{ wallIndex: 2, position: 0.5 }],
            windows: [],
            rooms: [],
            items: [],
          },
        ],
      })
    ).toThrow(/door wallIndex 2/i);
  });
});
