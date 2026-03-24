import * as THREE from "three";
import { createNode } from "@/lib/pascal/schemas";
import {
  createWallGeometry,
  getWallTransform,
  getWallLength,
  getWallMaterial,
} from "../wall-system";

function makeWall(start: { x: number; z: number }, end: { x: number; z: number }) {
  const id = `00000000-0000-4000-8000-${String(
    Math.abs(start.x * 10_000 + start.z * 1_000 + end.x * 100 + end.z * 10)
  ).padStart(12, "0")}`;
  return createNode("wall", {
    id,
    start: { x: start.x, y: 0, z: start.z },
    end: { x: end.x, y: 0, z: end.z },
  });
}

describe("wall-system", () => {
  describe("createWallGeometry", () => {
    it("returns a BufferGeometry with vertices for a normal wall", () => {
      const wall = makeWall({ x: 0, z: 0 }, { x: 5, z: 0 });
      const geo = createWallGeometry(wall);

      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      const posAttr = geo.getAttribute("position");
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(0);
    });

    it("returns a geometry with 0 vertices for a zero-length wall", () => {
      const wall = makeWall({ x: 3, z: 3 }, { x: 3, z: 3 });
      const geo = createWallGeometry(wall);

      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      const posAttr = geo.getAttribute("position");
      expect(posAttr).toBeUndefined();
    });
  });

  describe("getWallTransform", () => {
    it("places position at the midpoint of the wall", () => {
      const wall = makeWall({ x: 0, z: 0 }, { x: 10, z: 0 });
      const { position } = getWallTransform(wall);

      expect(position.x).toBeCloseTo(5);
      expect(position.z).toBeCloseTo(0);
      // y should be half the default height (2.7 / 2)
      expect(position.y).toBeCloseTo(2.7 / 2);
    });

    it("returns rotationY of 0 for a wall along the X-axis", () => {
      const wall = makeWall({ x: 0, z: 0 }, { x: 5, z: 0 });
      const { rotationY } = getWallTransform(wall);

      expect(rotationY).toBeCloseTo(0);
    });

    it("returns correct rotationY for a diagonal wall", () => {
      const wall = makeWall({ x: 0, z: 0 }, { x: 5, z: 5 });
      const { rotationY } = getWallTransform(wall);

      // atan2(5, 5) = PI/4, negated
      expect(rotationY).toBeCloseTo(-Math.PI / 4);
    });
  });

  describe("getWallLength", () => {
    it("returns correct Euclidean distance", () => {
      const wall = makeWall({ x: 0, z: 0 }, { x: 3, z: 4 });
      expect(getWallLength(wall)).toBeCloseTo(5);
    });

    it("returns 0 for a zero-length wall", () => {
      const wall = makeWall({ x: 2, z: 2 }, { x: 2, z: 2 });
      expect(getWallLength(wall)).toBeCloseTo(0);
    });
  });

  describe("getWallMaterial", () => {
    it("returns blue material when selected", () => {
      const wall = makeWall({ x: 0, z: 0 }, { x: 5, z: 0 });
      const mat = getWallMaterial(wall, true, false);

      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(mat.color.getHexString()).toBe(new THREE.Color("#4A90FF").getHexString());
    });

    it("returns non-selected material color when not selected", () => {
      const wall = makeWall({ x: 0, z: 0 }, { x: 5, z: 0 });
      const mat = getWallMaterial(wall, false, false);
      const expected = new THREE.Color("#efe4d4");
      const actualHsl = { h: 0, s: 0, l: 0 };
      const expectedHsl = { h: 0, s: 0, l: 0 };
      mat.color.getHSL(actualHsl);
      expected.getHSL(expectedHsl);

      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(actualHsl.h).toBeCloseTo(expectedHsl.h, 1);
      expect(actualHsl.s).toBeCloseTo(expectedHsl.s, 1);
      expect(actualHsl.l).toBeGreaterThan(expectedHsl.l - 0.08);
      expect(actualHsl.l).toBeLessThan(expectedHsl.l + 0.08);
    });

    it("prefers finish metadata over the legacy material string", () => {
      const wall = createNode("wall", {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 5, y: 0, z: 0 },
        material: "plaster",
        finishId: "wall-brick",
        finishVariantId: "heritage",
      });
      const mat = getWallMaterial(wall, false, false);

      const plaster = new THREE.Color("#f5f0e8");
      const actualHsl = { h: 0, s: 0, l: 0 };
      const plasterHsl = { h: 0, s: 0, l: 0 };
      mat.color.getHSL(actualHsl);
      plaster.getHSL(plasterHsl);

      expect(actualHsl.h).not.toBeCloseTo(plasterHsl.h, 2);
      expect(mat.roughness).toBeGreaterThan(0.7);
    });
  });
});
