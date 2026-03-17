import { useThree } from "@react-three/fiber";
import { useCallback } from "react";
import * as THREE from "three";
import { useViewer } from "@/stores/use-viewer";
import { sceneRegistry } from "@/lib/pascal/scene-registry";

export function SelectionManager() {
  // Selection is handled via onClick on mesh refs via sceneRegistry.
  // This component doesn't render anything — click handling is done
  // via the onPointerDown on the Canvas in FloorplanCanvas.
  return null;
}

export function useSelectionClick() {
  const { camera, raycaster, scene } = useThree();
  const { select, addToSelection, clearSelection } = useViewer();

  const handleClick = useCallback(
    (event: MouseEvent, shiftKey: boolean) => {
      const objects = Array.from(sceneRegistry.getAllObjects().values());
      if (objects.length === 0) {
        clearSelection();
        return;
      }

      // Find clicked node via userData
      const clickedNodeId = (event.target as any)?.userData?.nodeId as string | undefined;
      if (!clickedNodeId) {
        clearSelection();
        return;
      }

      if (shiftKey) {
        addToSelection(clickedNodeId);
      } else {
        select([clickedNodeId]);
      }
    },
    [select, addToSelection, clearSelection]
  );

  return { handleClick };
}
