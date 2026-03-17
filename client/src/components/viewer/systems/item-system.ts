import * as THREE from "three";
import type { ItemNode } from "@/lib/pascal/schemas";

const ITEM_COLORS: Record<string, string> = {
  furniture: "#c8a882",
  appliance: "#d0d0d0",
  fixture: "#b8b8c8",
  light: "#fffacd",
  custom: "#a0c8a0",
};

export function createItemGeometry(item: ItemNode): THREE.BufferGeometry {
  const d = item.dimensions ?? { x: 1, y: 1, z: 1 };
  return new THREE.BoxGeometry(d.x, d.y, d.z);
}

export function getItemTransform(item: ItemNode): { position: THREE.Vector3 } {
  const d = item.dimensions ?? { x: 1, y: 1, z: 1 };
  const pos = item.transform?.position ?? { x: 0, y: 0, z: 0 };
  return {
    position: new THREE.Vector3(pos.x, pos.y + d.y / 2, pos.z),
  };
}

export function getItemMaterial(item: ItemNode, isSelected: boolean): THREE.MeshStandardMaterial {
  const color = isSelected ? "#4A90FF" : (ITEM_COLORS[item.itemType ?? "furniture"] ?? "#c8a882");
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
}
