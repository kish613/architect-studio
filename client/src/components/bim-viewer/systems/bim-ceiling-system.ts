import * as THREE from "three";
import type { CanonicalBim, Ceiling } from "@shared/bim/canonical-schema";
import { createBimSurfaceMaterial } from "./bim-finish-resolver";

export function createBimCeilingGeometry(ceiling: Ceiling): THREE.BufferGeometry | null {
  const pts = ceiling.outline;
  if (!pts || pts.length < 3) return null;
  const shape = new THREE.Shape();
  shape.moveTo(pts[0]!.x, pts[0]!.z);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i]!.x, pts[i]!.z);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: ceiling.thickness,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function getBimCeilingMaterial(
  bim: CanonicalBim,
  ceiling: Ceiling,
  isSelected: boolean,
): THREE.MeshPhysicalMaterial {
  return createBimSurfaceMaterial(bim, ceiling.id, "ceiling", {
    selected: isSelected,
    side: THREE.DoubleSide,
  });
}
