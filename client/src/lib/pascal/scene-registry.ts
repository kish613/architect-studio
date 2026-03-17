import * as THREE from "three";

/**
 * Maps node IDs to their Three.js objects for fast lookup.
 * Used by selection, raycasting, and spatial queries.
 */
class SceneRegistry {
  private objectMap = new Map<string, THREE.Object3D>();
  private nodeIdMap = new Map<THREE.Object3D, string>();

  register(nodeId: string, object: THREE.Object3D): void {
    this.objectMap.set(nodeId, object);
    this.nodeIdMap.set(object, nodeId);
    object.userData.nodeId = nodeId;
  }

  unregister(nodeId: string): void {
    const object = this.objectMap.get(nodeId);
    if (object) {
      this.nodeIdMap.delete(object);
    }
    this.objectMap.delete(nodeId);
  }

  getObject(nodeId: string): THREE.Object3D | undefined {
    return this.objectMap.get(nodeId);
  }

  getNodeId(object: THREE.Object3D): string | undefined {
    let current: THREE.Object3D | null = object;
    while (current) {
      const nodeId = this.nodeIdMap.get(current);
      if (nodeId) return nodeId;
      current = current.parent;
    }
    return undefined;
  }

  getAllObjects(): Map<string, THREE.Object3D> {
    return new Map(this.objectMap);
  }

  clear(): void {
    this.objectMap.clear();
    this.nodeIdMap.clear();
  }

  get size(): number {
    return this.objectMap.size;
  }
}

export const sceneRegistry = new SceneRegistry();
