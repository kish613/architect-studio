import * as THREE from "three";

// Extension wall materials
export const brickMaterial = new THREE.MeshStandardMaterial({
  color: 0xb5651d,
  roughness: 0.85,
  metalness: 0.0,
});

export const renderMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8e0d4,
  roughness: 0.6,
  metalness: 0.0,
});

export const timberCladdingMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b6914,
  roughness: 0.7,
  metalness: 0.0,
});

// Roof materials
export const slateMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a4a4a,
  roughness: 0.7,
  metalness: 0.1,
});

export const flatRoofMaterial = new THREE.MeshStandardMaterial({
  color: 0x555555,
  roughness: 0.9,
  metalness: 0.0,
});

// Glass material
export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x88ccee,
  transparent: true,
  opacity: 0.35,
  roughness: 0.05,
  metalness: 0.1,
  transmission: 0.6,
});

// Window frame
export const frameMaterial = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.3,
  metalness: 0.5,
});

// Floor slab
export const concreteMaterial = new THREE.MeshStandardMaterial({
  color: 0x999999,
  roughness: 0.9,
  metalness: 0.0,
});

// Property base (existing building)
export const existingBuildingMaterial = new THREE.MeshStandardMaterial({
  color: 0x888888,
  transparent: true,
  opacity: 0.3,
  roughness: 0.5,
});

export const existingBuildingEdgeMaterial = new THREE.LineBasicMaterial({
  color: 0x666666,
});

// Ground
export const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x445533,
  roughness: 1.0,
  metalness: 0.0,
});

export type MaterialPreset = "brick" | "render" | "timber";

export function getWallMaterial(preset: MaterialPreset): THREE.MeshStandardMaterial {
  switch (preset) {
    case "brick":
      return brickMaterial;
    case "render":
      return renderMaterial;
    case "timber":
      return timberCladdingMaterial;
    default:
      return brickMaterial;
  }
}
