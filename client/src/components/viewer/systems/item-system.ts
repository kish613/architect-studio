import * as THREE from "three";
import type { ItemNode } from "@/lib/pascal/schemas";

const ITEM_PRESETS: Record<string, { color: string; roughness: number; metalness: number; clearcoat?: number; emissive?: string; emissiveIntensity?: number }> = {
  furniture: { color: "#c8a882", roughness: 0.6, metalness: 0, clearcoat: 0.2 },
  appliance: { color: "#d0d0d0", roughness: 0.3, metalness: 0.4 },
  fixture: { color: "#b8b8c8", roughness: 0.5, metalness: 0.15 },
  light: { color: "#fffacd", roughness: 0.4, metalness: 0.1, emissive: "#fffacd", emissiveIntensity: 0.3 },
  custom: { color: "#a0c8a0", roughness: 0.7, metalness: 0 },
};

export function createItemGeometry(item: ItemNode): THREE.BufferGeometry {
  const d = item.dimensions ?? { x: 1, y: 1, z: 1 };
  return new THREE.BoxGeometry(d.x, d.y, d.z);
}

export function getItemTransform(item: ItemNode): { position: THREE.Vector3; rotationY: number } {
  const d = item.dimensions ?? { x: 1, y: 1, z: 1 };
  const pos = item.transform?.position ?? { x: 0, y: 0, z: 0 };
  return {
    position: new THREE.Vector3(pos.x, pos.y + d.y / 2, pos.z),
    rotationY: item.transform?.rotation?.y ?? 0,
  };
}

export function getItemMaterial(item: ItemNode, isSelected: boolean): THREE.MeshPhysicalMaterial {
  if (isSelected) return new THREE.MeshPhysicalMaterial({ color: "#4A90FF", roughness: 0.5, metalness: 0.1 });

  const preset = ITEM_PRESETS[item.itemType ?? "furniture"] ?? ITEM_PRESETS.furniture;

  return new THREE.MeshPhysicalMaterial({
    color: preset.color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    clearcoat: preset.clearcoat ?? 0,
    envMapIntensity: 0.5,
    ...(preset.emissive ? { emissive: preset.emissive, emissiveIntensity: preset.emissiveIntensity } : {}),
  });
}
