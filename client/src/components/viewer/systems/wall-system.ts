import * as THREE from "three";
import type { WallNode } from "@/lib/pascal/schemas";

const WALL_MATERIALS: Record<string, { color: string; roughness: number; metalness: number }> = {
  plaster: { color: "#f5f0e8", roughness: 0.8, metalness: 0 },
  brick: { color: "#c4664a", roughness: 0.95, metalness: 0 },
  concrete: { color: "#b0b0b0", roughness: 0.85, metalness: 0.02 },
  glass: { color: "#a8d8ea", roughness: 0.05, metalness: 0.1 },
  wood: { color: "#c8a882", roughness: 0.7, metalness: 0 },
  stone: { color: "#9e9e9e", roughness: 0.9, metalness: 0 },
};

function hashVariation(id: string, range = 0.03): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000) * range * 2 - range;
}

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

export function getWallMaterial(wall: WallNode, isSelected: boolean, isHovered: boolean): THREE.MeshPhysicalMaterial {
  if (isSelected) return new THREE.MeshPhysicalMaterial({ color: "#4A90FF", roughness: 0.5, metalness: 0.1 });
  if (isHovered) return new THREE.MeshPhysicalMaterial({ color: "#78B4FF", roughness: 0.5, metalness: 0.1 });

  const matKey = wall.material ?? "plaster";
  const preset = WALL_MATERIALS[matKey] ?? WALL_MATERIALS.plaster;

  if (matKey === "glass") {
    return new THREE.MeshPhysicalMaterial({
      color: preset.color,
      roughness: preset.roughness,
      metalness: preset.metalness,
      transmission: 0.6,
      transparent: true,
      opacity: 0.4,
      envMapIntensity: 1.0,
    });
  }

  const color = new THREE.Color(preset.color);
  color.offsetHSL(0, 0, hashVariation(wall.id));

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    envMapIntensity: 0.6,
  });
}

export function getWallLength(wall: WallNode): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.sqrt(dx * dx + dz * dz);
}
