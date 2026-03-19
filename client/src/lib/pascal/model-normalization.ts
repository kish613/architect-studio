import * as THREE from "three";
import type { Vec3 } from "@/lib/pascal/schemas";

function safeScale(target: number, actual: number): number {
  return actual > 1e-6 ? target / actual : 1;
}

export function normalizeImportedModel(object: THREE.Object3D, targetDimensions: Vec3): THREE.Object3D {
  const clone = object.clone(true);
  clone.updateMatrixWorld(true);

  const sourceBounds = new THREE.Box3().setFromObject(clone);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const scale = new THREE.Vector3(
    safeScale(targetDimensions.x, sourceSize.x),
    safeScale(targetDimensions.y, sourceSize.y),
    safeScale(targetDimensions.z, sourceSize.z)
  );

  clone.scale.set(scale.x, scale.y, scale.z);
  clone.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(clone);
  const center = scaledBounds.getCenter(new THREE.Vector3());

  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= scaledBounds.min.y;
  clone.updateMatrixWorld(true);

  return clone;
}
