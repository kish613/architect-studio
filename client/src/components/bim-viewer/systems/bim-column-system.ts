import * as THREE from "three";
import type { CanonicalBim, Column } from "@shared/bim/canonical-schema";
import { createBimSurfaceMaterial } from "./bim-finish-resolver";

export function createBimColumnGeometry(col: Column): THREE.BufferGeometry {
  if (col.shape === "round") {
    const r = Math.max(col.width, col.depth) / 2;
    return new THREE.CylinderGeometry(r, r, col.height, 16);
  }
  return new THREE.BoxGeometry(col.width, col.height, col.depth);
}

export function getBimColumnTransform(
  col: Column,
  levelElevation: number,
): { position: THREE.Vector3 } {
  return {
    position: new THREE.Vector3(
      col.position.x,
      levelElevation + col.height / 2,
      col.position.z,
    ),
  };
}

export function getBimColumnMaterial(
  bim: CanonicalBim,
  col: Column,
  isSelected: boolean,
): THREE.MeshPhysicalMaterial {
  return createBimSurfaceMaterial(bim, col.id, "column", { selected: isSelected });
}
