import { vi } from "vitest";
import {
  siteNodeSchema,
  buildingNodeSchema,
  levelNodeSchema,
  zoneNodeSchema,
  wallNodeSchema,
  ceilingNodeSchema,
  slabNodeSchema,
  roofNodeSchema,
  doorNodeSchema,
  windowNodeSchema,
  guideNodeSchema,
  scanNodeSchema,
  itemNodeSchema,
  anyNodeSchema,
  sceneDataSchema,
  createNode,
  createEmptyScene,
} from "@/lib/pascal/schemas";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeBase(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    parentId: null,
    childIds: [],
    name: "test",
    visible: true,
    locked: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// vec3Schema (tested indirectly through node schemas that expose it)
// ---------------------------------------------------------------------------
describe("vec3Schema", () => {
  it("accepts a valid {x,y,z} object", () => {
    const result = wallNodeSchema.safeParse({
      ...makeBase(),
      type: "wall",
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 0, z: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects vec3 with missing fields", () => {
    const result = wallNodeSchema.safeParse({
      ...makeBase(),
      type: "wall",
      start: { x: 0 }, // missing y, z
      end: { x: 1, y: 0, z: 0 },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// transformSchema
// ---------------------------------------------------------------------------
describe("transformSchema", () => {
  it("defaults to identity transform when omitted", () => {
    const result = siteNodeSchema.parse({
      ...makeBase(),
      type: "site",
    });
    expect(result.transform).toEqual({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    });
  });
});

// ---------------------------------------------------------------------------
// Individual node schemas
// ---------------------------------------------------------------------------
describe("siteNodeSchema", () => {
  it("accepts minimal valid input", () => {
    const result = siteNodeSchema.safeParse({ ...makeBase(), type: "site" });
    expect(result.success).toBe(true);
  });

  it("applies default visible/locked", () => {
    const base = makeBase();
    delete (base as any).visible;
    delete (base as any).locked;
    const result = siteNodeSchema.parse({ ...base, type: "site" });
    expect(result.visible).toBe(true);
    expect(result.locked).toBe(false);
  });

  it("rejects wrong type literal", () => {
    const result = siteNodeSchema.safeParse({ ...makeBase(), type: "wall" });
    expect(result.success).toBe(false);
  });
});

describe("buildingNodeSchema", () => {
  it("accepts minimal valid input", () => {
    expect(buildingNodeSchema.safeParse({ ...makeBase(), type: "building" }).success).toBe(true);
  });

  it("rejects wrong type literal", () => {
    expect(buildingNodeSchema.safeParse({ ...makeBase(), type: "site" }).success).toBe(false);
  });
});

describe("levelNodeSchema", () => {
  it("accepts minimal valid input with defaults", () => {
    const result = levelNodeSchema.parse({ ...makeBase(), type: "level" });
    expect(result.elevation).toBe(0);
    expect(result.height).toBe(2.7);
    expect(result.index).toBe(0);
  });

  it("rejects wrong type literal", () => {
    expect(levelNodeSchema.safeParse({ ...makeBase(), type: "building" }).success).toBe(false);
  });
});

describe("zoneNodeSchema", () => {
  it("accepts minimal valid input with defaults", () => {
    const result = zoneNodeSchema.parse({ ...makeBase(), type: "zone" });
    expect(result.zoneType).toBe("room");
    expect(result.label).toBe("");
    expect(result.color).toBe("#4A90D9");
    expect(result.points).toEqual([]);
  });

  it("rejects wrong type literal", () => {
    expect(zoneNodeSchema.safeParse({ ...makeBase(), type: "wall" }).success).toBe(false);
  });
});

describe("wallNodeSchema", () => {
  it("accepts valid input with defaults", () => {
    const result = wallNodeSchema.parse({
      ...makeBase(),
      type: "wall",
      start: { x: 0, y: 0, z: 0 },
      end: { x: 5, y: 0, z: 0 },
    });
    expect(result.height).toBe(2.7);
    expect(result.thickness).toBe(0.15);
    expect(result.material).toBe("plaster");
  });

  it("rejects when start/end missing", () => {
    expect(wallNodeSchema.safeParse({ ...makeBase(), type: "wall" }).success).toBe(false);
  });
});

describe("ceilingNodeSchema", () => {
  it("accepts minimal valid input with defaults", () => {
    const result = ceilingNodeSchema.parse({ ...makeBase(), type: "ceiling" });
    expect(result.height).toBe(0.2);
    expect(result.material).toBe("plaster");
  });
});

describe("slabNodeSchema", () => {
  it("accepts minimal valid input with defaults", () => {
    const result = slabNodeSchema.parse({ ...makeBase(), type: "slab" });
    expect(result.thickness).toBe(0.3);
    expect(result.material).toBe("concrete");
  });
});

describe("roofNodeSchema", () => {
  it("accepts minimal valid input with defaults", () => {
    const result = roofNodeSchema.parse({ ...makeBase(), type: "roof" });
    expect(result.roofType).toBe("gable");
    expect(result.pitch).toBe(35);
    expect(result.overhang).toBe(0.3);
    expect(result.material).toBe("tile");
  });
});

describe("doorNodeSchema", () => {
  it("accepts valid input with defaults", () => {
    const wallId = crypto.randomUUID();
    const result = doorNodeSchema.parse({ ...makeBase(), type: "door", wallId });
    expect(result.width).toBe(0.9);
    expect(result.height).toBe(2.1);
    expect(result.doorType).toBe("single");
    expect(result.swing).toBe("left");
  });

  it("rejects when wallId is missing", () => {
    expect(doorNodeSchema.safeParse({ ...makeBase(), type: "door" }).success).toBe(false);
  });
});

describe("windowNodeSchema", () => {
  it("accepts valid input with defaults", () => {
    const wallId = crypto.randomUUID();
    const result = windowNodeSchema.parse({ ...makeBase(), type: "window", wallId });
    expect(result.width).toBe(1.2);
    expect(result.height).toBe(1.2);
    expect(result.sillHeight).toBe(0.9);
    expect(result.windowType).toBe("casement");
  });
});

describe("guideNodeSchema", () => {
  it("accepts minimal valid input with defaults", () => {
    const result = guideNodeSchema.parse({ ...makeBase(), type: "guide" });
    expect(result.guideType).toBe("line");
    expect(result.start).toEqual({ x: 0, y: 0, z: 0 });
    expect(result.end).toEqual({ x: 1, y: 0, z: 0 });
  });
});

describe("scanNodeSchema", () => {
  it("accepts valid input with defaults", () => {
    const result = scanNodeSchema.parse({
      ...makeBase(),
      type: "scan",
      imageUrl: "https://example.com/scan.png",
    });
    expect(result.width).toBe(10);
    expect(result.height).toBe(10);
    expect(result.opacity).toBe(0.5);
  });

  it("rejects when imageUrl is missing", () => {
    expect(scanNodeSchema.safeParse({ ...makeBase(), type: "scan" }).success).toBe(false);
  });
});

describe("itemNodeSchema", () => {
  it("accepts minimal valid input with defaults", () => {
    const result = itemNodeSchema.parse({ ...makeBase(), type: "item" });
    expect(result.itemType).toBe("furniture");
    expect(result.material).toBe("wood");
    expect(result.dimensions).toEqual({ x: 1, y: 1, z: 1 });
  });
});

// ---------------------------------------------------------------------------
// anyNodeSchema (discriminated union)
// ---------------------------------------------------------------------------
describe("anyNodeSchema", () => {
  it("dispatches to correct schema by type", () => {
    const result = anyNodeSchema.parse({ ...makeBase(), type: "site" });
    expect(result.type).toBe("site");
  });

  it("dispatches to wall schema and validates required fields", () => {
    const result = anyNodeSchema.safeParse({ ...makeBase(), type: "wall" });
    expect(result.success).toBe(false); // missing start/end
  });

  it("rejects unknown type", () => {
    const result = anyNodeSchema.safeParse({ ...makeBase(), type: "spaceship" });
    expect(result.success).toBe(false);
  });

  it("rejects missing type field", () => {
    const result = anyNodeSchema.safeParse(makeBase());
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createNode()
// ---------------------------------------------------------------------------
describe("createNode", () => {
  it("generates a valid UUID as id", () => {
    const node = createNode("site");
    expect(node.id).toMatch(UUID_REGEX);
  });

  it("sets sensible defaults", () => {
    const node = createNode("site");
    expect(node.type).toBe("site");
    expect(node.parentId).toBeNull();
    expect(node.childIds).toEqual([]);
    expect(node.visible).toBe(true);
    expect(node.locked).toBe(false);
  });

  it("applies overrides", () => {
    const node = createNode("level", { name: "Floor 2", elevation: 3 });
    expect(node.name).toBe("Floor 2");
    expect(node.elevation).toBe(3);
  });

  it("cannot override the type field", () => {
    // type is spread after overrides, so it stays correct
    const node = createNode("site", { type: "building" } as any);
    expect(node.type).toBe("site");
  });

  it("result passes Zod validation", () => {
    const node = createNode("zone", { zoneType: "kitchen" });
    const result = anyNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createEmptyScene()
// ---------------------------------------------------------------------------
describe("createEmptyScene", () => {
  it("creates exactly 3 nodes", () => {
    const scene = createEmptyScene();
    expect(Object.keys(scene.nodes)).toHaveLength(3);
  });

  it("creates site, building, and level nodes", () => {
    const scene = createEmptyScene();
    const types = Object.values(scene.nodes).map((n) => n.type).sort();
    expect(types).toEqual(["building", "level", "site"]);
  });

  it("has correct parent-child links", () => {
    const scene = createEmptyScene();
    const nodes = Object.values(scene.nodes);
    const site = nodes.find((n) => n.type === "site")!;
    const building = nodes.find((n) => n.type === "building")!;
    const level = nodes.find((n) => n.type === "level")!;

    expect(site.parentId).toBeNull();
    expect(building.parentId).toBe(site.id);
    expect(level.parentId).toBe(building.id);

    expect(site.childIds).toContain(building.id);
    expect(building.childIds).toContain(level.id);
  });

  it("sets site as the only root node", () => {
    const scene = createEmptyScene();
    expect(scene.rootNodeIds).toHaveLength(1);
    const site = Object.values(scene.nodes).find((n) => n.type === "site")!;
    expect(scene.rootNodeIds[0]).toBe(site.id);
  });

  it("passes sceneDataSchema validation", () => {
    const scene = createEmptyScene();
    const result = sceneDataSchema.safeParse(scene);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sceneDataSchema
// ---------------------------------------------------------------------------
describe("sceneDataSchema", () => {
  it("accepts a valid scene", () => {
    const scene = createEmptyScene();
    expect(sceneDataSchema.safeParse(scene).success).toBe(true);
  });

  it("rejects when nodes is missing", () => {
    expect(sceneDataSchema.safeParse({ rootNodeIds: [] }).success).toBe(false);
  });

  it("rejects when rootNodeIds is missing", () => {
    expect(sceneDataSchema.safeParse({ nodes: {} }).success).toBe(false);
  });
});
