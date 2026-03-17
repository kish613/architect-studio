import * as THREE from "three";
import type { RoofNode } from "@/lib/pascal/schemas";

export function createRoofGeometry(roof: RoofNode): THREE.BufferGeometry {
  const pts = roof.points;
  if (!pts || pts.length < 3) {
    // Fallback: flat box
    return new THREE.BoxGeometry(5, 0.2, 5);
  }

  // For flat roofs: extruded shape
  if (roof.roofType === "flat") {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].z);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].z);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  // For gable/shed: simple peaked shape using ConvexGeometry or manual vertices
  // Compute bounding box of footprint
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minZ = Math.min(...pts.map((p) => p.z));
  const maxZ = Math.max(...pts.map((p) => p.z));
  const pitch = roof.pitch ?? 35;
  const peakH = ((maxZ - minZ) / 2) * Math.tan((pitch * Math.PI) / 180);
  const cx = (minX + maxX) / 2;

  // 6 vertices: 4 corners + 2 ridge points
  const vertices = new Float32Array([
    minX, 0, minZ,  // 0 front-left
    maxX, 0, minZ,  // 1 front-right
    maxX, 0, maxZ,  // 2 back-right
    minX, 0, maxZ,  // 3 back-left
    cx,   peakH, minZ,  // 4 ridge-front
    cx,   peakH, maxZ,  // 5 ridge-back
  ]);

  const indices = [
    0, 1, 4,  // front face
    2, 3, 5,  // back face
    0, 4, 5, 0, 5, 3,  // left slope
    1, 2, 5, 1, 5, 4,  // right slope
    0, 3, 2, 0, 2, 1,  // underside
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function getRoofMaterial(isSelected: boolean): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: isSelected ? "#4A90FF" : "#8B4513",
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
}
