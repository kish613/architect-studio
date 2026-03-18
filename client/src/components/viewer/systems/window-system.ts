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
  frame: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
} {
  return {
    frame: new THREE.MeshPhysicalMaterial({
      color: isSelected ? "#4A90FF" : "#c0c0c0",
      roughness: 0.4,
      metalness: 0.3,
      envMapIntensity: 0.8,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: isSelected ? "#78B4FF" : "#cce8f4",
      transmission: 0.85,
      roughness: 0.05,
      metalness: 0,
      ior: 1.5,
      thickness: 0.05,
      transparent: true,
      envMapIntensity: 1.0,
      emissive: "#e0f0ff",
      emissiveIntensity: 0.08,
    }),
  };
}
