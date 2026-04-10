import { describe, expect, it } from "vitest";
import {
  canonicalBimToPascalScene,
  rawModelToCanonicalBim,
  toBimViewerPayload,
  validateCanonicalBim,
} from "../floorplan-pipeline/index.js";

describe("BIM-first floorplan pipeline", () => {
  const raw = {
    levels: [
      {
        name: "Ground Floor",
        index: 0,
        elevation: 0,
        walls: [
          { startX: 0, startZ: 0, endX: 6, endZ: 0, isExterior: true },
          { startX: 6, startZ: 0, endX: 6, endZ: 4, isExterior: true },
          { startX: 6, startZ: 4, endX: 0, endZ: 4, isExterior: true },
          { startX: 0, startZ: 4, endX: 0, endZ: 0, isExterior: true },
          { startX: 3, startZ: 0, endX: 3, endZ: 4 }, // interior divider
        ],
        doors: [
          { wallIndex: 4, position: 0.5, width: 0.9, height: 2.1, doorType: "single" },
        ],
        windows: [
          { wallIndex: 0, position: 0.3, width: 1.2, height: 1.2, sillHeight: 0.9, windowType: "casement" },
        ],
        rooms: [
          {
            name: "Living Room",
            zoneType: "living",
            points: [
              { x: 0, z: 0 },
              { x: 3, z: 0 },
              { x: 3, z: 4 },
              { x: 0, z: 4 },
            ],
            color: null,
          },
        ],
        items: [
          {
            name: "Sofa",
            itemType: "furniture" as const,
            position: { x: 1.5, z: 2 },
            dimensions: { x: 2, y: 0.8, z: 0.9 },
          },
          {
            name: "Toilet",
            itemType: "fixture" as const,
            position: { x: 5, z: 3 },
          },
        ],
      },
    ],
    metadata: { scaleConfidence: 0.7, extractionNotes: ["unit test"] },
  };

  it("converts a raw model into a schema-valid canonical BIM", () => {
    const bim = rawModelToCanonicalBim(raw, { sourceType: "image" });
    expect(bim.levels).toHaveLength(1);
    expect(bim.walls).toHaveLength(5);
    expect(bim.doors).toHaveLength(1);
    expect(bim.windows).toHaveLength(1);
    expect(bim.rooms).toHaveLength(1);
    expect(bim.furniture).toHaveLength(1);
    expect(bim.fixtures).toHaveLength(1);
    expect(bim.metadata.scaleConfidence).toBeCloseTo(0.7);
    expect(bim.doors[0].hostWallId).toBe(bim.walls[4].id);
    expect(bim.windows[0].hostWallId).toBe(bim.walls[0].id);
    expect(bim.walls[0].isExterior).toBe(true);
    expect(bim.walls[4].isExterior).toBe(false);
  });

  it("validate removes orphan openings", () => {
    const bim = rawModelToCanonicalBim(raw, { sourceType: "image" });
    // Add a fake door that points at a non-existent wall.
    bim.doors.push({
      id: "orphan-door",
      tags: [],
      kind: "door",
      hostWallId: "nope",
      position: 0.5,
      width: 0.9,
      height: 2.1,
      family: "single",
      swing: "left",
    });

    const { bim: safeBim, diagnostics } = validateCanonicalBim(bim);
    expect(safeBim.doors.map((d) => d.id)).not.toContain("orphan-door");
    expect(diagnostics.some((d) => d.code === "orphan-door")).toBe(true);
  });

  it("to-pascal adapter derives a Pascal scene the legacy editor can consume", () => {
    const bim = rawModelToCanonicalBim(raw, { sourceType: "image" });
    const scene = canonicalBimToPascalScene(bim);
    const nodeTypes = new Set(Object.values(scene.nodes).map((n) => n.type));
    expect(nodeTypes).toContain("site");
    expect(nodeTypes).toContain("building");
    expect(nodeTypes).toContain("level");
    expect(nodeTypes).toContain("wall");
    expect(nodeTypes).toContain("door");
    expect(nodeTypes).toContain("window");
    expect(nodeTypes).toContain("zone");
    expect(nodeTypes).toContain("item");
  });

  it("viewer payload summarises the BIM totals", () => {
    const bim = rawModelToCanonicalBim(raw, { sourceType: "image" });
    const payload = toBimViewerPayload(bim);
    expect(payload.totals.walls).toBe(5);
    expect(payload.totals.rooms).toBe(1);
    expect(payload.totals.furniture).toBe(1);
    expect(payload.totals.fixtures).toBe(1);
    expect(payload.rooms[0].areaSqm).toBeGreaterThan(0);
    expect(payload.walls.every((w) => w.length > 0)).toBe(true);
  });
});
