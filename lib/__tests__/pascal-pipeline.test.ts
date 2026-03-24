import { describe, it, expect } from "vitest";
import { postProcessGeminiData, buildSceneFromGemini } from "../pascal";
import type { ItemNode, DoorNode } from "../../shared/pascal-scene";

describe("full Gemini → Scene pipeline", () => {
  it("produces a scene with doors on walls and furniture in rooms", () => {
    const geminiData = {
      levels: [{
        name: "Ground Floor", index: 0, elevation: 0,
        walls: [
          { startX: 0, startZ: 0, endX: 6, endZ: 0 },
          { startX: 6, startZ: 0, endX: 6, endZ: 4 },
          { startX: 6, startZ: 4, endX: 0, endZ: 4 },
          { startX: 0, startZ: 4, endX: 0, endZ: 0 },
          { startX: 3, startZ: 0, endX: 3, endZ: 4 },
        ],
        doors: [
          { wallIndex: 4, position: 0.5, width: 0.9, height: 2.1, doorType: "single" as const, swing: "left" as const },
        ],
        windows: [
          { wallIndex: 0, position: 0.3, width: 1.2, height: 1.2, sillHeight: 0.9, windowType: "casement" as const },
        ],
        rooms: [
          { name: "Living Room", zoneType: "living" as const, points: [{x: 0, z: 0}, {x: 3, z: 0}, {x: 3, z: 4}, {x: 0, z: 4}], color: null },
          { name: "Bedroom", zoneType: "bedroom" as const, points: [{x: 3, z: 0}, {x: 6, z: 0}, {x: 6, z: 4}, {x: 3, z: 4}], color: null },
        ],
        items: [],
      }],
    };

    const processed = postProcessGeminiData(geminiData);
    const scene = buildSceneFromGemini(processed);
    const nodes = Object.values(scene.nodes);

    // Doors should exist and reference valid walls
    const doors = nodes.filter((n): n is DoorNode => n.type === "door");
    expect(doors.length).toBeGreaterThanOrEqual(1);
    for (const door of doors) {
      const wall = scene.nodes[door.wallId];
      expect(wall).toBeDefined();
      expect(wall.type).toBe("wall");
    }

    // Should have auto-furnished items with modelUrls
    const items = nodes.filter((n): n is ItemNode => n.type === "item");
    expect(items.length).toBeGreaterThanOrEqual(2);
    const withModels = items.filter((i) => i.modelUrl);
    expect(withModels.length).toBeGreaterThanOrEqual(1);

    // Items should be within scene bounds
    for (const item of items) {
      expect(Math.abs(item.transform.position.x)).toBeLessThan(50);
      expect(Math.abs(item.transform.position.z)).toBeLessThan(50);
    }
  });
});
