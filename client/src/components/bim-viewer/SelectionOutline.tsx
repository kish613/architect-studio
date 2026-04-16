import { useViewer } from '../../stores/use-viewer';
import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * Finds meshes in the scene whose `userData.nodeId` matches any of the given IDs.
 * BimSceneRenderer sets `userData={{ nodeId: elementId }}` on all BIM meshes/groups.
 */
function findMeshesByNodeIds(scene: THREE.Scene, nodeIds: string[]): THREE.Object3D[] {
  if (nodeIds.length === 0) return [];
  const idSet = new Set(nodeIds);
  const meshes: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.userData?.nodeId && idSet.has(obj.userData.nodeId)) {
      meshes.push(obj);
    }
  });
  return meshes;
}

/**
 * Hook that returns the selected and hovered meshes for outline rendering.
 * The Outline effects must be placed inside the EffectComposer, so we
 * expose a hook rather than a standalone component.
 */
export function useSelectionOutlineMeshes() {
  const selectedIds = useViewer((s) => s.selectedIds);
  const hoveredId = useViewer((s) => s.hoveredId);
  const scene = useThree((s) => s.scene);
  const [selectedMeshes, setSelectedMeshes] = useState<THREE.Object3D[]>([]);
  const [hoveredMeshes, setHoveredMeshes] = useState<THREE.Object3D[]>([]);

  useEffect(() => {
    setSelectedMeshes(findMeshesByNodeIds(scene, selectedIds));
  }, [selectedIds, scene]);

  useEffect(() => {
    if (!hoveredId) {
      setHoveredMeshes([]);
      return;
    }
    setHoveredMeshes(findMeshesByNodeIds(scene, [hoveredId]));
  }, [hoveredId, scene]);

  return { selectedMeshes, hoveredMeshes };
}
