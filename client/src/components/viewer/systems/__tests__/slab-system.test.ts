import * as THREE from "three";
import { createNode } from "@/lib/pascal/schemas";
import { createSlabGeometry, getSlabMaterial } from "../slab-system";

function makeSlab(points: Array<{ x: number; z: number }>) {
  return createNode("slab", {
    points: points.map((p) => ({ x: p.x, y: 0, z: p.z })),
  } as any);
}

describe("slab-system", () => {
  describe("createSlabGeometry", () => {
    it("returns null for fewer than 3 points", () => {
      const slab = makeSlab([
        { x: 0, z: 0 },
        { x: 1, z: 0 },
      ]);
      expect(createSlabGeometry(slab)).toBeNull();
    });

    it("returns null for empty points", () => {
      const slab = createNode("slab", { points: [] } as any);
      expect(createSlabGeometry(slab)).toBeNull();
    });

    it("returns geometry for 4 points (square)", () => {
      const slab = makeSlab([
        { x: 0, z: 0 },
        { x: 5, z: 0 },
        { x: 5, z: 5 },
        { x: 0, z: 5 },
      ]);
      const geo = createSlabGeometry(slab);

      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      expect(geo).not.toBeNull();
      expect(geo!.getAttribute("position")?.count).toBeGreaterThan(0);
    });
  });

  describe("getSlabMaterial", () => {
    it("returns a MeshStandardMaterial", () => {
      const mat = getSlabMaterial(false);
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it("uses blue when selected", () => {
      const mat = getSlabMaterial(true);
      expect(mat.color.getHexString()).toBe(new THREE.Color("#4A90FF").getHexString());
    });
  });
});
