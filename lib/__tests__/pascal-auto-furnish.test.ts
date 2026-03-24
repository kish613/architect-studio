import { describe, it, expect } from "vitest";
import { autoFurnishZone } from "../pascal-autofurnish";

describe("autoFurnishZone", () => {
  it("places a bed in a bedroom zone", () => {
    const bbox = { minX: 0, minZ: 0, maxX: 4, maxZ: 3 };
    const items = autoFurnishZone("bedroom", bbox);
    expect(items.length).toBeGreaterThanOrEqual(1);
    const bed = items.find((i) => i.catalogId?.includes("bed"));
    expect(bed).toBeDefined();
    expect(bed!.modelUrl).toBeDefined();
  });

  it("places a toilet in a bathroom zone", () => {
    const bbox = { minX: 0, minZ: 0, maxX: 2.5, maxZ: 2 };
    const items = autoFurnishZone("bathroom", bbox);
    const toilet = items.find((i) => i.catalogId?.includes("toilet"));
    expect(toilet).toBeDefined();
  });

  it("places a sofa in a living zone", () => {
    const bbox = { minX: 0, minZ: 0, maxX: 5, maxZ: 4 };
    const items = autoFurnishZone("living", bbox);
    const sofa = items.find((i) => i.catalogId?.includes("sofa"));
    expect(sofa).toBeDefined();
  });

  it("skips items that dont fit the room", () => {
    const tinyBbox = { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
    const items = autoFurnishZone("bedroom", tinyBbox);
    const bed = items.find((i) => i.catalogId === "bed-double-01");
    expect(bed).toBeUndefined();
  });

  it("returns empty for unknown zone type", () => {
    const bbox = { minX: 0, minZ: 0, maxX: 5, maxZ: 4 };
    const items = autoFurnishZone("other", bbox);
    expect(items).toEqual([]);
  });
});
