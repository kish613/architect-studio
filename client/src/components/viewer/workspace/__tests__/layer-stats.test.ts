import { describe, it, expect } from "vitest";
import { countLayers, WORKSPACE_LAYERS } from "../layer-stats";

describe("countLayers", () => {
  it("groups scene nodes by layer id", () => {
    const nodes = {
      a: { kind: "wall" }, b: { kind: "wall" }, c: { kind: "door" },
      d: { kind: "window" }, e: { kind: "item" }, f: { kind: "zone" },
    } as const;
    const counts = countLayers(nodes as any);
    expect(counts.walls).toBe(2);
    expect(counts.doors).toBe(1);
    expect(counts.windows).toBe(1);
    expect(counts.furn).toBe(1);
    expect(counts.soft).toBe(1);
  });

  it("returns zeros for empty/undefined input", () => {
    expect(countLayers(undefined).walls).toBe(0);
    expect(countLayers(null).walls).toBe(0);
    expect(countLayers({}).walls).toBe(0);
  });

  it("exposes 8 layers in display order", () => {
    expect(WORKSPACE_LAYERS.map(l => l.id)).toEqual(
      ["walls","doors","windows","furn","soft","light","dims","grid"]
    );
  });

  it("groups slab+roof under walls (structural)", () => {
    const counts = countLayers({ a: { kind: "slab" }, b: { kind: "roof" } } as any);
    expect(counts.walls).toBe(2);
  });
});
