import * as THREE from "three";
import type { SlabNode } from "@/lib/pascal/schemas";

export function createSlabGeometry(slab: SlabNode): THREE.BufferGeometry | null {
  const pts = slab.points;
  if (!pts || pts.length < 3) return null;

  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].z);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].z);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: slab.thickness ?? 0.3,
    bevelEnabled: false,
  });

  geometry.rotateX(-Math.PI / 2);

  return geometry;
}

export function getSlabMaterial(isSelected: boolean): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: isSelected ? "#4A90FF" : "#d5cfc4",
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.3,
    side: THREE.DoubleSide,
  });
}
