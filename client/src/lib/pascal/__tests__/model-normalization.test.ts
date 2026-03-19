import * as THREE from "three";
import { normalizeImportedModel } from "../model-normalization";

describe("normalizeImportedModel", () => {
  it("floor-aligns the actual bounds of the loaded model", () => {
    const geometry = new THREE.BoxGeometry(2, 4, 6);
    geometry.translate(0, 2, 0);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    const group = new THREE.Group();
    group.add(mesh);

    const normalized = normalizeImportedModel(group, { x: 4, y: 8, z: 12 });
    const bounds = new THREE.Box3().setFromObject(normalized);

    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(4);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(8);
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(12);
  });
});
