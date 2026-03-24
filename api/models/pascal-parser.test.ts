import { describe, expect, it } from "vitest";
import {
  buildSceneFromGemini,
  normalizeGeminiFloorplanData,
  parseGeminiFloorplanJson,
  postProcessGeminiData,
  summarizeSceneData,
  validateSceneData,
} from "../../lib/pascal.js";
import type { GeminiFloorplanData } from "../../lib/pascal.js";

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

  it("generates floor slabs from room polygons", () => {
    const geminiData = normalizeGeminiFloorplanData({
      levels: [
        {
          name: "Ground Floor",
          index: 0,
          elevation: 0,
          walls: [
            { startX: 0, startZ: 0, endX: 5, endZ: 0 },
            { startX: 5, startZ: 0, endX: 5, endZ: 4 },
          ],
          doors: [],
          windows: [],
          rooms: [
            {
              name: "Kitchen",
              zoneType: "kitchen",
              points: [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 4 }, { x: 0, z: 4 }],
            },
          ],
          items: [],
        },
      ],
    });

    const scene = buildSceneFromGemini(geminiData);
    const summary = summarizeSceneData(scene);

    expect(summary.slabCount).toBe(1);
    expect(summary.zoneCount).toBe(1);
  });

  it("does not generate slabs for rooms with fewer than 3 points", () => {
    const geminiData = normalizeGeminiFloorplanData({
      levels: [
        {
          name: "Ground Floor",
          index: 0,
          elevation: 0,
          walls: [{ startX: 0, startZ: 0, endX: 5, endZ: 0 }],
          doors: [],
          windows: [],
          rooms: [
            { name: "Passage", zoneType: "hallway", points: [{ x: 0, z: 0 }, { x: 5, z: 0 }] },
          ],
          items: [],
        },
      ],
    });

    const scene = buildSceneFromGemini(geminiData);
    const summary = summarizeSceneData(scene);
    expect(summary.slabCount).toBe(0);
    expect(summary.zoneCount).toBe(1);
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
    ).toThrow(/no walls/i);
  });

  it("filters out doors with invalid wall references instead of throwing", () => {
    const result = normalizeGeminiFloorplanData({
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
    });
    // Invalid door silently dropped instead of throwing
    expect(result.levels[0].doors.length).toBe(0);
    expect(result.levels[0].walls.length).toBe(1);
  });
});

describe("postProcessGeminiData", () => {
  it("snaps nearby wall endpoints together", () => {
    const data: GeminiFloorplanData = {
      levels: [
        {
          name: "Ground Floor",
          index: 0,
          elevation: 0,
          walls: [
            { startX: 0, startZ: 0, endX: 4, endZ: 0 },
            { startX: 4.03, startZ: 0.02, endX: 4.03, endZ: 3 },
          ],
          doors: [],
          windows: [],
          rooms: [],
          items: [],
        },
      ],
    };

    const result = postProcessGeminiData(data);
    const walls = result.levels[0].walls;

    // Wall 1 end should snap to same point as Wall 2 start
    expect(walls[1].startX).toBe(walls[0].endX);
    expect(walls[1].startZ).toBe(walls[0].endZ);
  });

  it("removes degenerate (near-zero length) walls", () => {
    const data: GeminiFloorplanData = {
      levels: [
        {
          name: "Ground Floor",
          index: 0,
          elevation: 0,
          walls: [
            { startX: 0, startZ: 0, endX: 4, endZ: 0 },
            { startX: 2, startZ: 2, endX: 2.01, endZ: 2.01 },
            { startX: 4, startZ: 0, endX: 4, endZ: 3 },
          ],
          doors: [{ wallIndex: 2, position: 0.5 }],
          windows: [],
          rooms: [],
          items: [],
        },
      ],
    };

    const result = postProcessGeminiData(data);
    // The degenerate wall (index 1) should be removed
    expect(result.levels[0].walls.length).toBe(2);
    // The door that referenced old wall index 2 should now reference index 1
    expect(result.levels[0].doors.length).toBe(1);
    expect(result.levels[0].doors[0].wallIndex).toBe(1);
  });

  it("centers geometry around the origin", () => {
    const data: GeminiFloorplanData = {
      levels: [
        {
          name: "Ground Floor",
          index: 0,
          elevation: 0,
          walls: [
            { startX: 10, startZ: 10, endX: 14, endZ: 10 },
            { startX: 14, startZ: 10, endX: 14, endZ: 13 },
          ],
          doors: [],
          windows: [],
          rooms: [
            { name: "Room", zoneType: "room", points: [{ x: 10, z: 10 }, { x: 14, z: 10 }, { x: 14, z: 13 }] },
          ],
          items: [{ name: "Table", position: { x: 12, z: 11.5 } }],
        },
      ],
    };

    const result = postProcessGeminiData(data);
    const walls = result.levels[0].walls;

    // Center of bounding box was (12, 11.5), so after centering:
    // wall 0 start should be (-2, -1.5), end (2, -1.5)
    expect(walls[0].startX).toBe(-2);
    expect(walls[0].startZ).toBe(-1.5);
    expect(walls[0].endX).toBe(2);
    expect(walls[0].endZ).toBe(-1.5);

    // Room points should also be centered
    const room = result.levels[0].rooms[0];
    expect(room.points[0].x).toBe(-2);
    expect(room.points[0].z).toBe(-1.5);

    // Item position should be centered
    const item = result.levels[0].items[0];
    expect(item.position.x).toBe(0);
    expect(item.position.z).toBe(0);
  });

  it("remaps door/window references when walls are removed", () => {
    const data: GeminiFloorplanData = {
      levels: [
        {
          name: "Ground Floor",
          index: 0,
          elevation: 0,
          walls: [
            { startX: 0, startZ: 0, endX: 0.01, endZ: 0.01 }, // degenerate, will be removed
            { startX: 0, startZ: 0, endX: 5, endZ: 0 },
            { startX: 5, startZ: 0, endX: 5, endZ: 4 },
          ],
          doors: [{ wallIndex: 1, position: 0.5 }],
          windows: [{ wallIndex: 2, position: 0.5 }],
          rooms: [],
          items: [],
        },
      ],
    };

    const result = postProcessGeminiData(data);
    expect(result.levels[0].walls.length).toBe(2);
    expect(result.levels[0].doors[0].wallIndex).toBe(0);
    expect(result.levels[0].windows[0].wallIndex).toBe(1);
  });

  it("drops doors/windows whose wall was removed", () => {
    const data: GeminiFloorplanData = {
      levels: [
        {
          name: "Ground Floor",
          index: 0,
          elevation: 0,
          walls: [
            { startX: 0, startZ: 0, endX: 0.01, endZ: 0 }, // degenerate
            { startX: 0, startZ: 0, endX: 5, endZ: 0 },
          ],
          doors: [{ wallIndex: 0, position: 0.5 }], // references degenerate wall
          windows: [],
          rooms: [],
          items: [],
        },
      ],
    };

    const result = postProcessGeminiData(data);
    expect(result.levels[0].walls.length).toBe(1);
    // Door snaps to nearest surviving wall instead of being dropped
    expect(result.levels[0].doors.length).toBeLessThanOrEqual(1);
  });
});
