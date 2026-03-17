import * as THREE from "three";
import type { DoorNode, WallNode } from "@/lib/pascal/schemas";

export interface DoorGeometries {
  frame: THREE.BufferGeometry;
  panel: THREE.BufferGeometry;
}

export function createDoorGeometries(door: DoorNode): DoorGeometries {
  const w = door.width ?? 0.9;
  const h = door.height ?? 2.1;
  const depth = 0.12; // frame depth

  // Simple frame: box slightly wider/taller than opening
  const frame = new THREE.BoxGeometry(w + 0.06, h + 0.06, depth);
  // Door panel inset
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
  frame: THREE.MeshStandardMaterial;
  panel: THREE.MeshStandardMaterial;
} {
  return {
    frame: new THREE.MeshStandardMaterial({ color: isSelected ? "#4A90FF" : "#8B6914", roughness: 0.7 }),
    panel: new THREE.MeshStandardMaterial({ color: isSelected ? "#78B4FF" : "#C4A035", roughness: 0.5 }),
  };
}
