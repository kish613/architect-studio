import * as THREE from "three";
import { createNode } from "@/lib/pascal/schemas";
import { createRoofGeometry, getRoofMaterial } from "../roof-system";

function makeRoof(
  roofType: "flat" | "gable" | "hip" | "mansard" | "shed",
  points: Array<{ x: number; z: number }>
) {
  return createNode("roof", {
    roofType,
    points: points.map((p) => ({ x: p.x, y: 0, z: p.z })),
  } as any);
}

describe("roof-system", () => {
  describe("createRoofGeometry", () => {
    it("returns a fallback box geometry when points are missing", () => {
      const roof = createNode("roof", { roofType: "flat", points: [] } as any);
      const geo = createRoofGeometry(roof);

      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      expect(geo.getAttribute("position")?.count).toBeGreaterThan(0);
    });

    it("returns a fallback box geometry for fewer than 3 points", () => {
      const roof = createNode("roof", {
        roofType: "gable",
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 5, y: 0, z: 0 },
        ],
      } as any);
      const geo = createRoofGeometry(roof);

      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      expect(geo.getAttribute("position")?.count).toBeGreaterThan(0);
    });

    it("returns geometry for a flat roof with valid points", () => {
      const roof = makeRoof("flat", [
        { x: 0, z: 0 },
        { x: 5, z: 0 },
        { x: 5, z: 5 },
        { x: 0, z: 5 },
      ]);
      const geo = createRoofGeometry(roof);

      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      expect(geo.getAttribute("position")?.count).toBeGreaterThan(0);
    });

    it("returns geometry with vertices for a gable roof", () => {
      const roof = makeRoof("gable", [
        { x: 0, z: 0 },
        { x: 6, z: 0 },
        { x: 6, z: 4 },
        { x: 0, z: 4 },
      ]);
      const geo = createRoofGeometry(roof);

      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      const posAttr = geo.getAttribute("position");
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(0);
    });
  });

  describe("getRoofMaterial", () => {
    it("returns a MeshStandardMaterial", () => {
      const mat = getRoofMaterial(false);
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it("uses blue when selected", () => {
      const mat = getRoofMaterial(true);
      expect(mat.color.getHexString()).toBe(new THREE.Color("#4A90FF").getHexString());
    });
  });
});
