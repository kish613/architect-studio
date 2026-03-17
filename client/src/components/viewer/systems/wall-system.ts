import * as THREE from "three";
import type { WallNode } from "@/lib/pascal/schemas";

const WALL_MATERIALS: Record<string, string> = {
  plaster: "#f5f0e8",
  brick: "#c4664a",
  concrete: "#b0b0b0",
  glass: "#a8d8ea",
  wood: "#c8a882",
  stone: "#9e9e9e",
};

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

export function getWallMaterial(wall: WallNode, isSelected: boolean, isHovered: boolean): THREE.MeshStandardMaterial {
  const color = isSelected ? "#4A90FF" : isHovered ? "#78B4FF" : (WALL_MATERIALS[wall.material ?? "plaster"] ?? "#f5f0e8");
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 });
}

export function getWallLength(wall: WallNode): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.sqrt(dx * dx + dz * dz);
}
