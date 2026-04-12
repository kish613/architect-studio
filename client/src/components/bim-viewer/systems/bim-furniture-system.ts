import * as THREE from "three";
import type { Fixture, Furniture } from "@shared/bim/canonical-schema";

export type BimPlacedAsset = Furniture | Fixture;

export function createBimAssetFallbackGeometry(asset: BimPlacedAsset): THREE.BufferGeometry {
  const d = asset.asset.dimensions;
  return new THREE.BoxGeometry(d.x, d.y, d.z);
}

export function getBimAssetWorldTransform(
  asset: BimPlacedAsset,
  levelElevation: number,
): { position: THREE.Vector3; rotationY: number } {
  const d = asset.asset.dimensions;
  const pos = asset.position;
  return {
    position: new THREE.Vector3(
      pos.x,
      levelElevation + pos.y + d.y / 2,
      pos.z,
    ),
    rotationY: asset.rotationY,
  };
}

export function getBimAssetFallbackMaterial(
  asset: BimPlacedAsset,
  isSelected: boolean,
): THREE.MeshPhysicalMaterial {
  if (isSelected) {
    return new THREE.MeshPhysicalMaterial({ color: "#4A90FF", roughness: 0.5, metalness: 0.1 });
  }
  const isFixture = asset.kind === "fixture";
  return new THREE.MeshPhysicalMaterial({
    color: isFixture ? "#c0c7d4" : "#b78d63",
    roughness: 0.58,
    metalness: 0.02,
    clearcoat: 0.12,
    envMapIntensity: 0.85,
  });
}
