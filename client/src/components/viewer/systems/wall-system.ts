import * as THREE from "three";
import type { WallNode } from "@/lib/pascal/schemas";
import { createFinishMaterial } from "@/lib/pascal/finish-resolver";

// ── Wall helpers ────────────────────────────────────────────────────────────

export function createWallGeometry(wall: WallNode): THREE.BufferGeometry {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const length = Math.sqrt(dx * dx + dz * dz);

  if (length < 0.001) return new THREE.BufferGeometry();

  return new THREE.BoxGeometry(length, wall.height ?? 2.7, wall.thickness ?? 0.15);
}

export function getWallTransform(wall: WallNode): { position: THREE.Vector3; rotationY: number } {
  const midX = (wall.start.x + wall.end.x) / 2;
  const midZ = (wall.start.z + wall.end.z) / 2;
  const midY = (wall.height ?? 2.7) / 2;
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const angle = Math.atan2(dz, dx);

  return {
    position: new THREE.Vector3(midX, midY, midZ),
    rotationY: -angle,
  };
}

export function getWallMaterial(wall: WallNode, isSelected: boolean, isHovered: boolean, length?: number): THREE.MeshPhysicalMaterial {
  const wallHeight = wall.height ?? 2.7;
  const wallLength = length ?? 2;
  return createFinishMaterial(wall, "wall", {
    selected: isSelected,
    hovered: isHovered,
    repeat: {
      x: wallLength / 2,
      y: wallHeight / 2,
    },
  });
}

export function getWallLength(wall: WallNode): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.sqrt(dx * dx + dz * dz);
}
