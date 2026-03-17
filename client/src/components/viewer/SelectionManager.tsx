import { useThree } from "@react-three/fiber";
import { useCallback } from "react";
import * as THREE from "three";
import { useViewer } from "@/stores/use-viewer";
import { sceneRegistry } from "@/lib/pascal/scene-registry";

export function SelectionManager() {
  return null;
}

export function useSelectionClick() {
  const { camera, gl, size } = useThree();
  const { select, addToSelection, clearSelection } = useViewer();

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const objects = Array.from(sceneRegistry.getAllObjects().values());
      if (objects.length === 0) {
        clearSelection();
        return;
      }

      const intersects = raycaster.intersectObjects(objects, true);
      if (intersects.length === 0) {
        clearSelection();
        return;
      }

      // Walk up from intersected object to find registered node
      const nodeId = sceneRegistry.getNodeId(intersects[0].object);
      if (!nodeId) {
        clearSelection();
        return;
      }

      if (event.shiftKey) {
        addToSelection(nodeId);
      } else {
        select([nodeId]);
      }
    },
    [camera, gl, select, addToSelection, clearSelection]
  );

  return { handlePointerDown };
}
