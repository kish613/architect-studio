import * as THREE from "three";
import { createNode } from "@/lib/pascal/schemas";
import {
  createWindowGeometries,
  getWindowPositionOnWall,
  getWindowMaterials,
} from "../window-system";

const wallId = crypto.randomUUID();

function makeWindow(overrides: Record<string, unknown> = {}) {
  return createNode("window", { wallId, ...overrides } as any);
}

function makeWall(start: { x: number; z: number }, end: { x: number; z: number }) {
  return createNode("wall", {
    start: { x: start.x, y: 0, z: start.z },
    end: { x: end.x, y: 0, z: end.z },
  });
}

describe("window-system", () => {
  describe("createWindowGeometries", () => {
    it("returns frame and glass geometries", () => {
      const win = makeWindow();
      const { frame, glass } = createWindowGeometries(win);

      expect(frame).toBeInstanceOf(THREE.BufferGeometry);
      expect(glass).toBeInstanceOf(THREE.BufferGeometry);
    });

    it("frame and glass have vertices", () => {
      const win = makeWindow();
      const { frame, glass } = createWindowGeometries(win);

      expect(frame.getAttribute("position")?.count).toBeGreaterThan(0);
      expect(glass.getAttribute("position")?.count).toBeGreaterThan(0);
    });
  });

  describe("getWindowPositionOnWall", () => {
    it("position=0.5 places the window at the wall midpoint", () => {
      const win = makeWindow({ position: 0.5 });
      const wall = makeWall({ x: 0, z: 0 }, { x: 10, z: 0 });
      const pos = getWindowPositionOnWall(win, wall);

      expect(pos.x).toBeCloseTo(5);
      expect(pos.z).toBeCloseTo(0);
    });

    it("y accounts for sillHeight plus half window height", () => {
      const win = makeWindow({ sillHeight: 0.9, height: 1.2 });
      const wall = makeWall({ x: 0, z: 0 }, { x: 10, z: 0 });
      const pos = getWindowPositionOnWall(win, wall);

      // y = sillHeight + height/2 = 0.9 + 0.6 = 1.5
      expect(pos.y).toBeCloseTo(1.5);
    });
  });

  describe("getWindowMaterials", () => {
    it("glass material is transparent with opacity < 1", () => {
      const { glass } = getWindowMaterials(false);

      expect(glass).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(glass.transparent).toBe(true);
      expect(glass.opacity).toBeLessThan(1);
    });

    it("returns frame and glass materials", () => {
      const { frame, glass } = getWindowMaterials(false);

      expect(frame).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(glass).toBeInstanceOf(THREE.MeshStandardMaterial);
    });
  });
});
