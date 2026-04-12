import * as THREE from "three";
import type { CanonicalBim, Stair } from "@shared/bim/canonical-schema";
import { createBimSurfaceMaterial } from "./bim-finish-resolver";

export interface BimStairStep {
  position: THREE.Vector3;
  rotationY: number;
  width: number;
  rise: number;
  treadDepth: number;
}

export function getBimStairSteps(stair: Stair, levelElevation: number): BimStairStep[] {
  const dx = stair.end.x - stair.start.x;
  const dz = stair.end.z - stair.start.z;
  const runLen = Math.hypot(dx, dz);
  if (runLen < 0.001 || stair.numSteps < 1) return [];

  const rise = stair.riseTotal / stair.numSteps;
  const treadDepth = runLen / stair.numSteps;
  const angle = Math.atan2(dz, dx);

  const steps: BimStairStep[] = [];
  for (let i = 0; i < stair.numSteps; i++) {
    const t0 = i / stair.numSteps;
    const bx = stair.start.x + dx * t0;
    const bz = stair.start.z + dz * t0;
    const by = levelElevation + i * rise + rise / 2;
    steps.push({
      position: new THREE.Vector3(bx, by, bz),
      rotationY: -angle,
      width: stair.width,
      rise,
      treadDepth,
    });
  }
  return steps;
}

export function getBimStairMaterial(
  bim: CanonicalBim,
  stair: Stair,
  isSelected: boolean,
): THREE.MeshPhysicalMaterial {
  return createBimSurfaceMaterial(bim, stair.id, "stair", { selected: isSelected });
}
