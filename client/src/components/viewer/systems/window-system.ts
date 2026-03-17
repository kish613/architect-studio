import * as THREE from "three";
import type { WindowNode, WallNode } from "@/lib/pascal/schemas";

export interface WindowGeometries {
  frame: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
}

export function createWindowGeometries(win: WindowNode): WindowGeometries {
  const w = win.width ?? 1.2;
  const h = win.height ?? 1.2;
  const depth = 0.12;

  const frame = new THREE.BoxGeometry(w + 0.08, h + 0.08, depth);
  const glass = new THREE.BoxGeometry(w - 0.06, h - 0.06, depth * 0.2);

  return { frame, glass };
}

export function getWindowPositionOnWall(
  win: WindowNode,
  wall: WallNode
): THREE.Vector3 {
  const t = win.position ?? 0.5;
  const x = wall.start.x + (wall.end.x - wall.start.x) * t;
  const z = wall.start.z + (wall.end.z - wall.start.z) * t;
  const sillH = win.sillHeight ?? 0.9;
  const y = sillH + (win.height ?? 1.2) / 2;
  return new THREE.Vector3(x, y, z);
}

export function getWindowMaterials(isSelected: boolean): {
  frame: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
} {
  return {
    frame: new THREE.MeshStandardMaterial({ color: isSelected ? "#4A90FF" : "#d4d4d4", roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({
      color: isSelected ? "#78B4FF" : "#a8d8ea",
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.2,
    }),
  };
}
