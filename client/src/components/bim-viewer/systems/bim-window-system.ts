import * as THREE from "three";
import type { Wall, Window as BimWindow } from "@shared/bim/canonical-schema";

export interface BimWindowGeometries {
  frame: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
}

export function createBimWindowGeometries(win: BimWindow): BimWindowGeometries {
  const w = win.width;
  const h = win.height;
  const depth = 0.12;
  const frame = new THREE.BoxGeometry(w + 0.08, h + 0.08, depth);
  const glass = new THREE.BoxGeometry(w - 0.06, h - 0.06, depth * 0.2);
  return { frame, glass };
}

export function getBimWindowPositionOnWall(
  win: BimWindow,
  wall: Wall,
  levelElevation: number,
): THREE.Vector3 {
  const t = win.position;
  const x = wall.start.x + (wall.end.x - wall.start.x) * t;
  const z = wall.start.z + (wall.end.z - wall.start.z) * t;
  const y = levelElevation + win.sillHeight + win.height / 2;
  return new THREE.Vector3(x, y, z);
}

export function getBimWindowMaterials(isSelected: boolean): {
  frame: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
} {
  // Frame: aluminium-look with emissive selection tint
  const frameProps: THREE.MeshPhysicalMaterialParameters = {
    color: "#c0c0c0",
    roughness: 0.4,
    metalness: 0.3,
    envMapIntensity: 0.8,
  };

  if (isSelected) {
    frameProps.emissive = new THREE.Color("#4A90FF");
    frameProps.emissiveIntensity = 0.3;
  }

  // Glass: physically-based with transmission (no fake blue tint)
  const glassProps: THREE.MeshPhysicalMaterialParameters = {
    color: "#ffffff",
    transmission: 0.95,
    roughness: 0.02,
    metalness: 0,
    ior: 1.52,
    thickness: 0.006,
    transparent: true,
    opacity: 1, // Let transmission handle transparency
    envMapIntensity: 1.2,
  };

  if (isSelected) {
    glassProps.emissive = new THREE.Color("#4A90FF");
    glassProps.emissiveIntensity = 0.25;
  }

  return {
    frame: new THREE.MeshPhysicalMaterial(frameProps),
    glass: new THREE.MeshPhysicalMaterial(glassProps),
  };
}
