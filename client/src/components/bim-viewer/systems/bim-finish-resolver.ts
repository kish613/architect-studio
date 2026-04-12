import * as THREE from "three";
import type { CanonicalBim } from "@shared/bim/canonical-schema";

export type BimSurfaceKind =
  | "wall"
  | "slab"
  | "ceiling"
  | "roof"
  | "stair"
  | "column"
  | "item";

interface FinishOpts {
  selected?: boolean;
  hovered?: boolean;
  repeat?: { x: number; y: number };
  side?: THREE.Side;
}

export function createBimSurfaceMaterial(
  _bim: CanonicalBim,
  elementId: string,
  surface: BimSurfaceKind,
  opts: FinishOpts = {},
  hints?: { isExteriorWall?: boolean },
): THREE.MeshPhysicalMaterial {
  if (opts.selected) {
    return new THREE.MeshPhysicalMaterial({
      color: "#4A90FF",
      roughness: 0.5,
      metalness: 0.1,
      side: opts.side,
    });
  }
  if (opts.hovered) {
    return new THREE.MeshPhysicalMaterial({
      color: "#78B4FF",
      roughness: 0.5,
      metalness: 0.1,
      side: opts.side,
    });
  }

  let h = 0;
  for (let i = 0; i < elementId.length; i++) {
    h = (h * 31 + elementId.charCodeAt(i)) | 0;
  }
  const jitter = ((h % 1000) / 1000) * 0.04 - 0.02;

  if (surface === "wall") {
    const base = hints?.isExteriorWall ? "#c4bcb0" : "#e8e4dc";
    const c = new THREE.Color(base);
    c.offsetHSL(0, 0, jitter);
    return new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: hints?.isExteriorWall ? 0.82 : 0.62,
      metalness: 0.02,
      envMapIntensity: 0.35,
      side: opts.side,
    });
  }

  if (surface === "slab" || surface === "ceiling") {
    const c = new THREE.Color(surface === "slab" ? "#9d958a" : "#f0ebe3");
    c.offsetHSL(0, 0, jitter);
    return new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: 0.55,
      metalness: 0.04,
      envMapIntensity: 0.3,
      side: opts.side ?? THREE.DoubleSide,
    });
  }

  if (surface === "roof") {
    const c = new THREE.Color("#6b5344");
    c.offsetHSL(0, 0, jitter);
    return new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: 0.75,
      metalness: 0.05,
      envMapIntensity: 0.25,
      side: opts.side ?? THREE.DoubleSide,
    });
  }

  if (surface === "stair") {
    return new THREE.MeshPhysicalMaterial({
      color: "#8b7355",
      roughness: 0.65,
      metalness: 0.02,
      side: opts.side,
    });
  }

  if (surface === "column") {
    return new THREE.MeshPhysicalMaterial({
      color: "#d0c9bf",
      roughness: 0.5,
      metalness: 0.08,
      side: opts.side,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: "#b8b0a6",
    roughness: 0.58,
    metalness: 0.02,
    side: opts.side,
  });
}
