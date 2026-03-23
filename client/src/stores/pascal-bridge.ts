/**
 * Pascal Bridge (stub)
 *
 * Previously converted our scene format to an external @pascal-app/core store.
 * Now the local SceneRenderer reads directly from useScene, so these functions
 * are intentional no-ops that preserve the call-site API in use-scene.ts.
 */

import type { AnyNode as OurAnyNode, SceneData as OurSceneData } from "@/lib/pascal/schemas";

/**
 * No-op — SceneRenderer reads from useScene directly.
 */
export function syncNodeToPascal(
  _node: OurAnyNode,
  _allNodes: Record<string, OurAnyNode>,
): void {}

/**
 * No-op — SceneRenderer reads from useScene directly.
 */
export function syncNodeUpdateToPascal(
  _nodeId: string,
  _changes: Partial<OurAnyNode>,
  _allNodes: Record<string, OurAnyNode>,
): void {}

/**
 * No-op — SceneRenderer reads from useScene directly.
 */
export function deleteNodeFromPascal(_nodeId: string): void {}

/**
 * No-op — useScene.loadScene() already sets the store state that
 * SceneRenderer subscribes to.
 */
export function loadSceneIntoPascal(_sceneData: OurSceneData): void {}
