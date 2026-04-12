import * as THREE from "three";
import type { CanonicalBim, Wall } from "@shared/bim/canonical-schema";
import { createBimSurfaceMaterial } from "./bim-finish-resolver";

export function createBimWallGeometry(wall: Wall): THREE.BufferGeometry {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 0.001) return new THREE.BufferGeometry();
  return new THREE.BoxGeometry(length, wall.height, wall.thickness);
}

export function getBimWallTransform(
  wall: Wall,
  levelElevation: number,
): { position: THREE.Vector3; rotationY: number } {
  const midX = (wall.start.x + wall.end.x) / 2;
  const midZ = (wall.start.z + wall.end.z) / 2;
  const midY = levelElevation + wall.height / 2;
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const angle = Math.atan2(dz, dx);
  return {
    position: new THREE.Vector3(midX, midY, midZ),
    rotationY: -angle,
  };
}

export function getBimWallMaterial(
  bim: CanonicalBim,
  wall: Wall,
  isSelected: boolean,
  isHovered: boolean,
  length?: number,
): THREE.MeshPhysicalMaterial {
  const wallHeight = wall.height;
  const wallLength = length ?? 2;
  return createBimSurfaceMaterial(bim, wall.id, "wall", {
    selected: isSelected,
    hovered: isHovered,
    repeat: { x: wallLength / 2, y: wallHeight / 2 },
  }, { isExteriorWall: wall.isExterior });
}

export function getBimWallLength(wall: Wall): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
}
