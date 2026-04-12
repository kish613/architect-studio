import * as THREE from "three";
import type { Door, Wall } from "@shared/bim/canonical-schema";

export interface BimDoorGeometries {
  frame: THREE.BufferGeometry;
  panel: THREE.BufferGeometry;
}

export function createBimDoorGeometries(door: Door): BimDoorGeometries {
  const w = door.width;
  const h = door.height;
  const depth = 0.12;
  const frame = new THREE.BoxGeometry(w + 0.06, h + 0.06, depth);
  const panel = new THREE.BoxGeometry(w - 0.04, h - 0.04, depth * 0.4);
  return { frame, panel };
}

export function getBimDoorPositionOnWall(
  door: Door,
  wall: Wall,
  levelElevation: number,
): THREE.Vector3 {
  const t = door.position;
  const x = wall.start.x + (wall.end.x - wall.start.x) * t;
  const z = wall.start.z + (wall.end.z - wall.start.z) * t;
  const y = levelElevation + door.height / 2;
  return new THREE.Vector3(x, y, z);
}

export function getBimDoorMaterials(isSelected: boolean): {
  frame: THREE.MeshPhysicalMaterial;
  panel: THREE.MeshPhysicalMaterial;
} {
  return {
    frame: new THREE.MeshPhysicalMaterial({
      color: isSelected ? "#4A90FF" : "#5C3D1A",
      roughness: 0.75,
      metalness: 0,
      envMapIntensity: 0.3,
    }),
    panel: new THREE.MeshPhysicalMaterial({
      color: isSelected ? "#78B4FF" : "#8B6914",
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.4,
    }),
  };
}
