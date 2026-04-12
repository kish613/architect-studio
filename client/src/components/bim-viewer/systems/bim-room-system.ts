import * as THREE from "three";
import type { Room } from "@shared/bim/canonical-schema";

/** Thin floor plate for room zones (visual only) */
export function createBimRoomFloorGeometry(room: Room, thickness = 0.04): THREE.BufferGeometry | null {
  const pts = room.outline;
  if (!pts || pts.length < 3) return null;
  const shape = new THREE.Shape();
  shape.moveTo(pts[0]!.x, pts[0]!.z);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i]!.x, pts[i]!.z);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function getBimRoomFloorMaterial(room: Room): THREE.MeshPhysicalMaterial {
  const c = new THREE.Color(room.color ?? "#4A90D9");
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.72,
    metalness: 0.02,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}
