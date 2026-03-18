import * as THREE from "three";
import type { DoorNode, WallNode } from "@/lib/pascal/schemas";

export interface DoorGeometries {
  frame: THREE.BufferGeometry;
  panel: THREE.BufferGeometry;
}

export function createDoorGeometries(door: DoorNode): DoorGeometries {
  const w = door.width ?? 0.9;
  const h = door.height ?? 2.1;
  const depth = 0.12;

  const frame = new THREE.BoxGeometry(w + 0.06, h + 0.06, depth);
  const panel = new THREE.BoxGeometry(w - 0.04, h - 0.04, depth * 0.4);

  return { frame, panel };
}

export function getDoorPositionOnWall(
  door: DoorNode,
  wall: WallNode
): THREE.Vector3 {
  const t = door.position ?? 0.5;
  const x = wall.start.x + (wall.end.x - wall.start.x) * t;
  const z = wall.start.z + (wall.end.z - wall.start.z) * t;
  const y = (door.height ?? 2.1) / 2;
  return new THREE.Vector3(x, y, z);
}

export function getDoorMaterials(isSelected: boolean): {
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
