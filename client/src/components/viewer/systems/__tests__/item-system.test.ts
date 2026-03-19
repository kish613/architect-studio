import * as THREE from "three";
import { createNode } from "@/lib/pascal/schemas";
import {
  createItemGeometry,
  getItemTransform,
  getItemMaterial,
} from "../item-system";

function makeItem(overrides: Record<string, unknown> = {}) {
  return createNode("item", overrides as any);
}

describe("item-system", () => {
  describe("createItemGeometry", () => {
    it("creates a 1x1x1 geometry with default dimensions", () => {
      const item = makeItem();
      const geo = createItemGeometry(item);

      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      expect(geo.getAttribute("position")?.count).toBeGreaterThan(0);

      // BoxGeometry(1,1,1) bounding box check
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      expect(box.max.x - box.min.x).toBeCloseTo(1);
      expect(box.max.y - box.min.y).toBeCloseTo(1);
      expect(box.max.z - box.min.z).toBeCloseTo(1);
    });

    it("uses item dimensions when provided", () => {
      const item = makeItem({ dimensions: { x: 2, y: 3, z: 4 } });
      const geo = createItemGeometry(item);

      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      expect(box.max.x - box.min.x).toBeCloseTo(2);
      expect(box.max.y - box.min.y).toBeCloseTo(3);
      expect(box.max.z - box.min.z).toBeCloseTo(4);
    });
  });

  describe("getItemTransform", () => {
    it("y-offset equals half the item height for default dimensions", () => {
      const item = makeItem();
      const { position } = getItemTransform(item);

      // default dimensions y=1, transform position y=0, so y = 0 + 1/2 = 0.5
      expect(position.y).toBeCloseTo(0.5);
    });

    it("uses transform position when provided", () => {
      const item = makeItem({
        dimensions: { x: 1, y: 2, z: 1 },
        transform: {
          position: { x: 5, y: 0, z: 3 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });
      const { position } = getItemTransform(item);

      expect(position.x).toBeCloseTo(5);
      expect(position.z).toBeCloseTo(3);
      // y = transform.position.y + dimensions.y / 2 = 0 + 1 = 1
      expect(position.y).toBeCloseTo(1);
    });
  });

  describe("getItemMaterial", () => {
    it("returns a MeshPhysicalMaterial", () => {
      const item = makeItem();
      const mat = getItemMaterial(item, false);
      expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    });

    it("returns blue when selected", () => {
      const item = makeItem();
      const mat = getItemMaterial(item, true);
      expect(mat.color.getHexString()).toBe(new THREE.Color("#4A90FF").getHexString());
    });

    it("uses a more realistic finish for furniture", () => {
      const item = makeItem({ itemType: "furniture" });
      const mat = getItemMaterial(item, false);

      expect(mat.clearcoat).toBeGreaterThan(0);
      expect(mat.roughness).toBeLessThan(1);
    });
  });
});
