import * as THREE from "three";
import { createNode } from "@/lib/pascal/schemas";
import {
  createDoorGeometries,
  getDoorPositionOnWall,
  getDoorMaterials,
} from "../door-system";

const wallId = crypto.randomUUID();

function makeDoor(overrides: Record<string, unknown> = {}) {
  return createNode("door", { wallId, ...overrides } as any);
}

function makeWall(start: { x: number; z: number }, end: { x: number; z: number }) {
  return createNode("wall", {
    start: { x: start.x, y: 0, z: start.z },
    end: { x: end.x, y: 0, z: end.z },
  });
}

describe("door-system", () => {
  describe("createDoorGeometries", () => {
    it("returns frame and panel geometries", () => {
      const door = makeDoor();
      const { frame, panel } = createDoorGeometries(door);

      expect(frame).toBeInstanceOf(THREE.BufferGeometry);
      expect(panel).toBeInstanceOf(THREE.BufferGeometry);
    });

    it("frame and panel have vertices", () => {
      const door = makeDoor();
      const { frame, panel } = createDoorGeometries(door);

      expect(frame.getAttribute("position")?.count).toBeGreaterThan(0);
      expect(panel.getAttribute("position")?.count).toBeGreaterThan(0);
    });
  });

  describe("getDoorPositionOnWall", () => {
    it("position=0.5 places the door at the wall midpoint", () => {
      const door = makeDoor({ position: 0.5 });
      const wall = makeWall({ x: 0, z: 0 }, { x: 10, z: 0 });
      const pos = getDoorPositionOnWall(door, wall);

      expect(pos.x).toBeCloseTo(5);
      expect(pos.z).toBeCloseTo(0);
    });

    it("y equals half the door height", () => {
      const door = makeDoor({ height: 2.1 });
      const wall = makeWall({ x: 0, z: 0 }, { x: 10, z: 0 });
      const pos = getDoorPositionOnWall(door, wall);

      expect(pos.y).toBeCloseTo(2.1 / 2);
    });
  });

  describe("getDoorMaterials", () => {
    it("returns frame and panel materials", () => {
      const { frame, panel } = getDoorMaterials(false);

      expect(frame).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(panel).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it("uses blue tones when selected", () => {
      const { frame, panel } = getDoorMaterials(true);

      expect(frame.color.getHexString()).toBe(new THREE.Color("#4A90FF").getHexString());
      expect(panel.color.getHexString()).toBe(new THREE.Color("#78B4FF").getHexString());
    });
  });
});
