import * as THREE from "three";
import type { CanonicalBim, Roof } from "@shared/bim/canonical-schema";
import { createBimSurfaceMaterial } from "./bim-finish-resolver";

export function createBimRoofGeometry(roof: Roof): THREE.BufferGeometry {
  const pts = roof.outline;
  if (!pts || pts.length < 3) {
    return new THREE.BoxGeometry(5, 0.2, 5);
  }

  if (roof.roofType === "flat") {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0]!.x, pts[0]!.z);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i]!.x, pts[i]!.z);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minZ = Math.min(...pts.map((p) => p.z));
  const maxZ = Math.max(...pts.map((p) => p.z));
  const pitch = roof.pitchDeg;
  const peakH = ((maxZ - minZ) / 2) * Math.tan((pitch * Math.PI) / 180);
  const cx = (minX + maxX) / 2;

  const vertices = new Float32Array([
    minX, 0, minZ,
    maxX, 0, minZ,
    maxX, 0, maxZ,
    minX, 0, maxZ,
    cx, peakH, minZ,
    cx, peakH, maxZ,
  ]);

  const indices = [
    0, 1, 4,
    2, 3, 5,
    0, 4, 5, 0, 5, 3,
    1, 2, 5, 1, 5, 4,
    0, 3, 2, 0, 2, 1,
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function getBimRoofMaterial(
  bim: CanonicalBim,
  roof: Roof,
  isSelected: boolean,
): THREE.MeshPhysicalMaterial {
  return createBimSurfaceMaterial(bim, roof.id, "roof", {
    selected: isSelected,
    side: THREE.DoubleSide,
  });
}
