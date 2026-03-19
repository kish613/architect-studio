import * as THREE from "three";
import type { ItemNode } from "@/lib/pascal/schemas";

const ITEM_PRESETS: Record<string, {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transmission?: number;
  ior?: number;
}> = {
  furniture: { color: "#b78d63", roughness: 0.58, metalness: 0.02, clearcoat: 0.15 },
  appliance: { color: "#d7d9de", roughness: 0.22, metalness: 0.42, clearcoat: 0.08 },
  fixture: { color: "#c0c7d4", roughness: 0.38, metalness: 0.18, clearcoat: 0.1 },
  light: { color: "#fff2c8", roughness: 0.32, metalness: 0.05, emissive: "#fff2c8", emissiveIntensity: 0.35 },
  custom: { color: "#9cc4a4", roughness: 0.7, metalness: 0.02 },
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
  const isGlass = item.material?.toLowerCase?.() === "glass";

  return new THREE.MeshPhysicalMaterial({
    color: preset.color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    clearcoat: preset.clearcoat ?? (isGlass ? 0.85 : 0.05),
    envMapIntensity: isGlass ? 1.2 : 0.85,
    transmission: isGlass ? 0.4 : preset.transmission ?? 0,
    ior: isGlass ? 1.45 : preset.ior ?? 1.5,
    transparent: isGlass,
    opacity: isGlass ? 0.78 : 1,
    ...(preset.emissive ? { emissive: preset.emissive, emissiveIntensity: preset.emissiveIntensity } : {}),
  });
}
